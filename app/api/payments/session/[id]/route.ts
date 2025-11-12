import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Fetch payment session details
    const paymentResult = await query(
      `SELECT p.*, i.invoice_number, i.status as invoice_status,
              u.name as buyer_name, u.email as buyer_email
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN users u ON i.buyer_id = u.id
       WHERE p.stripe_checkout_session_id = $1 OR p.stripe_payment_intent_id = $1`,
      [sessionId]
    );

    if (paymentResult.length === 0) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404 }
      );
    }

    const payment = paymentResult[0];

    // Return relevant session information
    return NextResponse.json({
      session_id: payment.stripe_checkout_session_id,
      payment_intent_id: payment.stripe_payment_intent_id,
      status: payment.status,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency,
      invoice: {
        id: payment.invoice_id,
        invoice_number: payment.invoice_number,
        status: payment.invoice_status
      },
      buyer: payment.buyer_name ? {
        name: payment.buyer_name,
        email: payment.buyer_email
      } : null,
      created_at: payment.created_at,
      processed_at: payment.processed_at,
      failure_reason: payment.failure_reason
    });
  } catch (error) {
    console.error('Error fetching payment session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}