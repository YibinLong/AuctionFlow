import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionExpired(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const invoiceId = session.metadata?.invoice_id;

    if (!invoiceId) {
      console.error('No invoice ID in session metadata');
      return;
    }

    // Update payment session status
    await query(
      `UPDATE payment_sessions
       SET status = 'completed', stripe_payment_status = 'paid', updated_at = NOW()
       WHERE session_id = $1`,
      [session.id]
    );

    // Update invoice status
    await query(
      `UPDATE invoices
       SET status = 'paid', payment_method = 'stripe', updated_at = NOW()
       WHERE id = $1`,
      [invoiceId]
    );

    // Log successful payment
    await auditLogger.logPaymentSucceeded(
      session.id,
      invoiceId,
      undefined, // Would get user_id from webhook metadata or session
      {
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || 'usd'
      }
    );

    console.log(`Payment completed for invoice ${invoiceId}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  try {
    const invoiceId = session.metadata?.invoice_id;

    if (!invoiceId) {
      console.error('No invoice ID in session metadata');
      return;
    }

    // Update payment session status
    await query(
      `UPDATE payment_sessions
       SET status = 'expired', stripe_payment_status = 'unpaid', updated_at = NOW()
       WHERE session_id = $1`,
      [session.id]
    );

    // Log expired payment
    await auditLogger.logPaymentFailed(
      session.id,
      invoiceId,
      'Payment session expired'
    );

    console.log(`Payment session expired for invoice ${invoiceId}`);
  } catch (error) {
    console.error('Error handling checkout session expired:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
    // Additional payment intent handling if needed
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`PaymentIntent failed: ${paymentIntent.id}`);

    // Find the associated payment session and update its status
    const sessions = await query(
      `SELECT * FROM payment_sessions WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    if (sessions.length > 0) {
      const session = sessions[0];

      await query(
        `UPDATE payment_sessions
         SET status = 'failed', stripe_payment_status = 'failed', updated_at = NOW()
         WHERE session_id = $1`,
        [session.session_id]
      );

      // Log failed payment
      await auditLogger.logPaymentFailed(
        session.session_id,
        session.invoice_id,
        paymentIntent.last_payment_error?.message || 'Payment failed'
      );
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}