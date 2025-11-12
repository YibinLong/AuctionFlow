import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      invoice_id,
      success_url,
      cancel_url,
      payment_method_types = ['card']
    } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice details
    const invoices = await query(
      'SELECT * FROM invoices WHERE id = $1 AND status = $2',
      [invoice_id, 'pending']
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found or already processed' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];
    const amount = Math.round(parseFloat(invoice.grand_total) * 100); // Convert to cents

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Auction Invoice ${invoice.invoice_number}`,
              description: `Payment for auction items`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        invoice_id: invoice_id.toString(),
        invoice_number: invoice.invoice_number,
      },
    });

    // Store payment session in database
    const paymentSessions = await query(
      `INSERT INTO payment_sessions (
        session_id, invoice_id, stripe_session_id, amount, currency,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        session.id,
        invoice_id,
        session.id,
        amount / 100, // Convert back to dollars
        'usd',
        'created'
      ]
    );

    const paymentSession = paymentSessions[0];

    // Log payment attempt
    await auditLogger.logPaymentAttempted(
      session.id,
      invoice_id,
      undefined, // Would get user_id from session
      { amount: amount / 100, currency: 'usd' }
    );

    return NextResponse.json({
      session_id: session.id,
      payment_url: session.url,
      payment_session: paymentSession
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}