import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import { query } from '@/lib/db';
import { calculateInvoiceTotals } from '@/lib/calculations';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice from database
    const invoices = await query(
      `SELECT i.*, ai.auction_id, ai.auction_title, ai.auction_date,
              u.name as buyer_name, u.email as buyer_email
       FROM invoices i
       LEFT JOIN auction_items ai ON i.auction_item_id = ai.id
       LEFT JOIN users u ON i.buyer_id = u.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];

    // Fetch invoice items
    const items = await query(
      `SELECT ii.*, ai.title as item_title, ai.lot_number
       FROM invoice_items ii
       LEFT JOIN auction_items ai ON ii.auction_item_id = ai.id
       WHERE ii.invoice_id = $1`,
      [invoiceId]
    );

    // Log invoice view
    await auditLogger.logInvoiceViewed(invoiceId);

    return NextResponse.json({
      invoice: {
        ...invoice,
        items
      }
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      auction_item_id,
      buyer_id,
      items,
      buyers_premium_rate,
      tax_rate,
      premium_tiers
    } = body;

    // Validate required fields
    if (!auction_item_id || !buyer_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: auction_item_id, buyer_id, items' },
        { status: 400 }
      );
    }

    // Calculate invoice totals
    const calculation = calculateInvoiceTotals({
      items,
      buyers_premium_rate,
      tax_rate,
      premium_tiers
    });

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create invoice in database
    const invoices = await query(
      `INSERT INTO invoices (
        invoice_number, auction_item_id, buyer_id, subtotal,
        buyers_premium_amount, tax_amount, grand_total, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        invoiceNumber,
        auction_item_id,
        buyer_id,
        calculation.subtotal.toNumber(),
        calculation.buyers_premium_amount.toNumber(),
        calculation.tax_amount.toNumber(),
        calculation.grand_total.toNumber(),
        'pending'
      ]
    );

    const newInvoice = invoices[0];

    // Create invoice items
    for (const item of items) {
      await query(
        `INSERT INTO invoice_items (
          invoice_id, auction_item_id, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          newInvoice.id,
          item.lot_id,
          item.quantity,
          item.unit_price,
          new Decimal(item.unit_price).times(item.quantity).toNumber()
        ]
      );
    }

    // Log invoice creation
    await auditLogger.logInvoiceCreated(
      newInvoice.id,
      buyer_id,
      {},
      { invoice_number: invoiceNumber, total: calculation.grand_total.toNumber() }
    );

    return NextResponse.json({
      invoice: {
        ...newInvoice,
        items,
        calculation
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}