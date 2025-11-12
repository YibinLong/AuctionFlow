import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

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
        items,
        subtotal: parseFloat(invoice.subtotal),
        buyers_premium_amount: parseFloat(invoice.buyers_premium_amount),
        tax_amount: parseFloat(invoice.tax_amount),
        grand_total: parseFloat(invoice.grand_total)
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await request.json();
    const { status, payment_method, notes } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Get current invoice for audit trail
    const currentInvoices = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );

    if (currentInvoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const currentInvoice = currentInvoices[0];

    // Update invoice
    const updatedInvoices = await query(
      `UPDATE invoices
       SET status = $1, payment_method = $2, notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, payment_method, notes, invoiceId]
    );

    const updatedInvoice = updatedInvoices[0];

    // Log invoice update
    await auditLogger.logInvoiceUpdated(
      invoiceId,
      undefined, // We'd get user_id from session in real implementation
      { status: currentInvoice.status },
      { status, payment_method, notes }
    );

    return NextResponse.json({
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}