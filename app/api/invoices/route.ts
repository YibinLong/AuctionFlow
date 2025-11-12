import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '@/lib/db';
import { calculateInvoiceTotals } from '@/lib/calculations';
import { auditLogger } from '@/lib/audit-logger';
import { CreateInvoiceRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyer_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (buyerId) {
      whereClause += ` AND i.buyer_id = $${paramIndex}`;
      queryParams.push(buyerId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Fetch invoices with buyer information
    const invoices = await query(
      `SELECT i.*, u.name as buyer_name, u.email as buyer_email,
              COUNT(ii.id) as item_count
       FROM invoices i
       LEFT JOIN users u ON i.buyer_id = u.id
       LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
       ${whereClause}
       GROUP BY i.id, u.name, u.email
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(DISTINCT i.id) as total
       FROM invoices i
       ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateInvoiceRequest = await request.json();

    // Validate request
    if (!body.buyer_id || !body.auction_result_ids || body.auction_result_ids.length === 0) {
      return NextResponse.json(
        { error: 'buyer_id and auction_result_ids are required' },
        { status: 400 }
      );
    }

    // Get auction results and verify they exist and belong to the same buyer
    const auctionResults = await query(
      `SELECT ar.*, ai.title, ai.lot_id, ai.description
       FROM auction_results ar
       JOIN auction_items ai ON ar.item_id = ai.id
       WHERE ar.id = ANY($1)
       FOR UPDATE`,
      [body.auction_result_ids]
    );

    if (auctionResults.length !== body.auction_result_ids.length) {
      return NextResponse.json(
        { error: 'One or more auction results not found' },
        { status: 404 }
      );
    }

    // Verify all results belong to the same buyer
    const uniqueBuyers = new Set(auctionResults.map(r => r.buyer_id));
    if (uniqueBuyers.size > 1) {
      return NextResponse.json(
        { error: 'All auction results must belong to the same buyer' },
        { status: 400 }
      );
    }

    const actualBuyerId = Array.from(uniqueBuyers)[0];
    if (actualBuyerId !== body.buyer_id) {
      return NextResponse.json(
        { error: 'Buyer ID mismatch with auction results' },
        { status: 400 }
      );
    }

    // Check if auction results are already invoiced
    const existingInvoices = await query(
      `SELECT invoice_id FROM invoice_items
       WHERE item_id = ANY(
         SELECT item_id FROM auction_results WHERE id = ANY($1)
       )`,
      [body.auction_result_ids]
    );

    if (existingInvoices.length > 0) {
      return NextResponse.json(
        { error: 'One or more auction results are already invoiced' },
        { status: 400 }
      );
    }

    // Create invoice within a transaction
    const result = await transaction(async (client) => {
      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${uuidv4().slice(0, 8)}`;

      // Prepare calculation inputs
      const calculationInputs = {
        items: auctionResults.map(ar => ({
          lot_id: ar.lot_id,
          title: ar.title,
          quantity: 1,
          unit_price: parseFloat(ar.winning_bid.toString())
        })),
        buyers_premium_rate: body.custom_rates?.buyers_premium_rate || parseFloat(ar.winning_bid.toString()),
        tax_rate: body.custom_rates?.tax_rate || 0.085 // Default 8.5%
      };

      // Calculate totals
      const calculations = calculateInvoiceTotals(calculationInputs);

      // Create invoice
      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          id, invoice_number, buyer_id, status, subtotal,
          buyers_premium_rate, buyers_premium_amount,
          tax_rate, tax_amount, grand_total, currency, due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          uuidv4(),
          invoiceNumber,
          body.buyer_id,
          'pending',
          calculations.subtotal.toNumber(),
          calculations.breakdown.buyers_premium.rate.toNumber(),
          calculations.breakdown.buyers_premium.amount.toNumber(),
          calculations.breakdown.tax.rate.toNumber(),
          calculations.breakdown.tax.amount.toNumber(),
          calculations.grand_total.toNumber(),
          'USD',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        ]
      );

      const invoice = invoiceResult.rows[0];

      // Create invoice items
      for (const (index, ar) of auctionResults.entries()) {
        await client.query(
          `INSERT INTO invoice_items (
            id, invoice_id, item_id, lot_id, title, quantity, unit_price, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            invoice.id,
            ar.item_id,
            ar.lot_id,
            ar.title,
            1,
            parseFloat(ar.winning_bid.toString()),
            parseFloat(ar.winning_bid.toString())
          ]
        );
      }

      // Update auction results status
      await client.query(
        `UPDATE auction_results SET status = 'pending' WHERE id = ANY($1)`,
        [body.auction_result_ids]
      );

      // Get complete invoice with items
      const completeInvoice = await client.query(
        `SELECT i.*, u.name as buyer_name, u.email as buyer_email
         FROM invoices i
         LEFT JOIN users u ON i.buyer_id = u.id
         WHERE i.id = $1`,
        [invoice.id]
      );

      const items = await client.query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1`,
        [invoice.id]
      );

      return {
        ...completeInvoice.rows[0],
        items: items.rows
      };
    });

    // Log invoice creation
    try {
      await auditLogger.logInvoiceCreated(
        result.id,
        undefined, // Will add user ID when auth is implemented
        {},
        result as any
      );
    } catch (auditError) {
      console.error('Failed to log invoice creation:', auditError);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}