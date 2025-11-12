import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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

    // Fetch session from our database first
    const paymentSessions = await query(
      `SELECT ps.*, i.invoice_number, i.status as invoice_status
       FROM payment_sessions ps
       LEFT JOIN invoices i ON ps.invoice_id = i.id
       WHERE ps.session_id = $1`,
      [sessionId]
    );

    if (paymentSessions.length === 0) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404 }
      );
    }

    const paymentSession = paymentSessions[0];

    // Get latest session data from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Update our database with latest status from Stripe
    const updatedStatus = stripeSession.payment_status === 'paid' ? 'completed' :
                         stripeSession.status === 'expired' ? 'expired' :
                         stripeSession.status;

    if (paymentSession.status !== updatedStatus) {
      await query(
        `UPDATE payment_sessions
         SET status = $1, stripe_payment_status = $2, updated_at = NOW()
         WHERE session_id = $3`,
        [updatedStatus, stripeSession.payment_status, sessionId]
      );

      // Update invoice status if payment is completed
      if (stripeSession.payment_status === 'paid' && paymentSession.invoice_status !== 'paid') {
        await query(
          `UPDATE invoices
           SET status = 'paid', payment_method = 'stripe', updated_at = NOW()
           WHERE id = $1`,
          [paymentSession.invoice_id]
        );

        // Log successful payment
        await auditLogger.logPaymentSucceeded(
          sessionId,
          paymentSession.invoice_id,
          undefined, // Would get user_id from session
          { amount: paymentSession.amount, currency: paymentSession.currency }
        );
      }
    }

    return NextResponse.json({
      session: {
        id: paymentSession.session_id,
        status: updatedStatus,
        payment_status: stripeSession.payment_status,
        amount: paymentSession.amount,
        currency: paymentSession.currency,
        invoice_number: paymentSession.invoice_number,
        created_at: paymentSession.created_at,
        updated_at: paymentSession.updated_at
      },
      stripe_session: {
        id: stripeSession.id,
        status: stripeSession.status,
        payment_status: stripeSession.payment_status,
        amount_total: stripeSession.amount_total,
        currency: stripeSession.currency,
        success_url: stripeSession.success_url,
        cancel_url: stripeSession.cancel_url
      }
    });
  } catch (error) {
    console.error('Error fetching payment session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}