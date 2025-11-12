import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { query, transaction } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    if (!session.metadata?.invoice_id) {
      console.error('No invoice_id in session metadata');
      return;
    }

    const invoiceId = session.metadata.invoice_id;
    const paymentIntentId = session.payment_intent;

    // Update payment record
    await query(
      `UPDATE payments
       SET stripe_payment_intent_id = $1,
           status = 'succeeded',
           processed_at = NOW()
       WHERE stripe_checkout_session_id = $2`,
      [paymentIntentId, session.id]
    );

    // Update invoice status
    await transaction(async (client) => {
      // Update invoice to paid
      await client.query(
        `UPDATE invoices
         SET status = 'paid', updated_at = NOW()
         WHERE id = $1`,
        [invoiceId]
      );

      // Update auction results
      await client.query(
        `UPDATE auction_results ar
         SET status = 'paid'
         FROM invoice_items ii
         WHERE ii.invoice_id = $1 AND ii.item_id = ar.item_id`,
        [invoiceId]
      );
    });

    // Log successful payment
    await auditLogger.logPaymentSucceeded(
      paymentIntentId as string,
      invoiceId,
      session.metadata.buyer_id,
      {
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        session_id: session.id
      }
    );

    console.log(`Payment succeeded for invoice ${invoiceId}, payment intent ${paymentIntentId}`);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  try {
    if (!session.metadata?.invoice_id) {
      console.error('No invoice_id in session metadata');
      return;
    }

    const invoiceId = session.metadata.invoice_id;

    // Update payment record
    await query(
      `UPDATE payments
       SET status = 'cancelled'
       WHERE stripe_checkout_session_id = $1`,
      [session.id]
    );

    // Log expired session
    await auditLogger.logPaymentFailed(
      session.payment_intent as string,
      invoiceId,
      'Checkout session expired',
      session.metadata.buyer_id
    );

    console.log(`Payment session expired for invoice ${invoiceId}`);
  } catch (error) {
    console.error('Error handling checkout.session.expired:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);
    // This is also handled in checkout.session.completed
    // Keeping this for redundancy and direct payment intent handling
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment intent failed: ${paymentIntent.id}, reason: ${paymentIntent.last_payment_error?.message}`);

    // Update payment record if we have a matching one
    await query(
      `UPDATE payments
       SET status = 'failed',
           failure_reason = $1,
           processed_at = NOW()
       WHERE stripe_payment_intent_id = $2`,
      [paymentIntent.last_payment_error?.message || 'Payment failed', paymentIntent.id]
    );

    // Log failed payment
    await auditLogger.logPaymentFailed(
      paymentIntent.id,
      'unknown', // We don't have invoice_id directly from payment_intent
      paymentIntent.last_payment_error?.message || 'Payment failed'
    );
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}