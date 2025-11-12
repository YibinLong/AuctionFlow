import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { Invoice, InvoiceItem, User } from '@/lib/types';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice with items and buyer information
    const invoiceResult = await query<Invoice & { buyer_name: string; buyer_email: string }>(
      `SELECT i.*, u.name as buyer_name, u.email as buyer_email
       FROM invoices i
       LEFT JOIN users u ON i.buyer_id = u.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult[0];

    // Fetch invoice items
    const itemsResult = await query<InvoiceItem>(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at`,
      [invoiceId]
    );

    // Combine invoice with items and buyer info
    const response = {
      ...invoice,
      items: itemsResult,
      buyer_info: invoice.buyer_name ? {
        name: invoice.buyer_name,
        email: invoice.buyer_email
      } : null
    };

    // Log invoice view
    try {
      await auditLogger.logInvoiceViewed(invoiceId);
    } catch (auditError) {
      console.error('Failed to log invoice view:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json(response);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const body = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await query<Invoice>(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );

    if (existingInvoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const oldValues = existingInvoice[0];
    let newValues: Partial<Invoice> = {};

    // Update status if provided
    if (body.status && ['pending', 'paid', 'overdue', 'cancelled', 'refunded'].includes(body.status)) {
      newValues.status = body.status;
    }

    // Update rates if provided (recalculate totals)
    if (body.buyers_premium_rate !== undefined || body.tax_rate !== undefined) {
      if (body.buyers_premium_rate !== undefined) {
        newValues.buyers_premium_rate = body.buyers_premium_rate;
      }
      if (body.tax_rate !== undefined) {
        newValues.tax_rate = body.tax_rate;
      }

      // Recalculate totals
      const items = await query<InvoiceItem>(
        'SELECT * FROM invoice_items WHERE invoice_id = $1',
        [invoiceId]
      );

      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price.toString()), 0);
      const buyersPremiumRate = body.buyers_premium_rate ?? oldValues.buyers_premium_rate;
      const taxRate = body.tax_rate ?? oldValues.tax_rate;

      const buyersPremiumAmount = subtotal * parseFloat(buyersPremiumRate.toString());
      const taxAmount = (subtotal + buyersPremiumAmount) * parseFloat(taxRate.toString());
      const grandTotal = subtotal + buyersPremiumAmount + taxAmount;

      newValues.subtotal = subtotal;
      newValues.buyers_premium_amount = buyersPremiumAmount;
      newValues.tax_amount = taxAmount;
      newValues.grand_total = grandTotal;
    }

    if (Object.keys(newValues).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update invoice
    const updateResult = await query<Invoice>(
      `UPDATE invoices
       SET ${Object.keys(newValues).map((key, index) => `${key} = $${index + 2}`).join(', ')}
       WHERE id = $1
       RETURNING *`,
      [invoiceId, ...Object.values(newValues)]
    );

    const updatedInvoice = updateResult[0];

    // Log the update
    try {
      await auditLogger.logInvoiceUpdated(
        invoiceId,
        undefined, // We'll add user ID when auth is implemented
        oldValues as any,
        updatedInvoice as any
      );
    } catch (auditError) {
      console.error('Failed to log invoice update:', auditError);
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}