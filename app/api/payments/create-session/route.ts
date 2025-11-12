import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';
import { CreatePaymentRequest } from '@/lib/types';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();

    // Validate request
    if (!body.invoice_id || !body.success_url || !body.cancel_url) {
      return NextResponse.json(
        { error: 'invoice_id, success_url, and cancel_url are required' },
        { status: 400 }
      );
    }

    // Fetch invoice details
    const invoiceResult = await query(
      `SELECT i.*, u.email as buyer_email, u.name as buyer_name
       FROM invoices i
       LEFT JOIN users u ON i.buyer_id = u.id
       WHERE i.id = $1 AND i.status = 'pending'`,
      [body.invoice_id]
    );

    if (invoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found or not payable' },
        { status: 404 }
      );
    }

    const invoice = invoiceResult[0];

    // Fetch invoice items for line items
    const itemsResult = await query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [body.invoice_id]
    );

    // Create line items for Stripe Checkout
    const lineItems = itemsResult.map(item => ({
      price_data: {
        currency: invoice.currency.toLowerCase(),
        product_data: {
          name: item.title,
          description: `Lot #${item.lot_id}`,
          metadata: {
            lot_id: item.lot_id,
            invoice_id: invoice.id
          }
        },
        unit_amount: Math.round(parseFloat(item.unit_price.toString()) * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add buyer's premium as separate line item
    if (parseFloat(invoice.buyers_premium_amount.toString()) > 0) {
      lineItems.push({
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: "Buyer's Premium",
            description: `${(parseFloat(invoice.buyers_premium_rate.toString()) * 100).toFixed(2)}% premium`,
            metadata: {
              invoice_id: invoice.id,
              fee_type: 'buyers_premium'
            } as any
          },
          unit_amount: Math.round(parseFloat(invoice.buyers_premium_amount.toString()) * 100),
        },
        quantity: 1,
      });
    }

    // Add tax as separate line item
    if (parseFloat(invoice.tax_amount.toString()) > 0) {
      lineItems.push({
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: 'Sales Tax',
            description: `${(parseFloat(invoice.tax_rate.toString()) * 100).toFixed(2)}% tax`,
            metadata: {
              invoice_id: invoice.id,
              fee_type: 'tax'
            } as any
          },
          unit_amount: Math.round(parseFloat(invoice.tax_amount.toString()) * 100),
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      customer_email: invoice.buyer_email,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        buyer_id: invoice.buyer_id
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US'], // Restrict to US for now
      },
      phone_number_collection: {
        enabled: true,
      },
      custom_fields: [
        {
          key: 'buyer_reference',
          label: {
            type: 'custom',
            custom: 'Buyer Reference (Optional)',
          },
          type: 'text',
          optional: true,
        },
      ],
    });

    // Store payment intent in database
    await query(
      `INSERT INTO payments (
        id, invoice_id, stripe_checkout_session_id, amount, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session.payment_intent || session.id, // Use payment_intent if available, otherwise session id
        invoice.id,
        session.id,
        parseFloat(invoice.grand_total.toString()),
        invoice.currency,
        'pending'
      ]
    );

    // Log payment attempt
    try {
      await auditLogger.logPaymentAttempted(
        typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        invoice.id,
        invoice.buyer_id,
        {
          amount: invoice.grand_total,
          currency: invoice.currency,
          session_id: session.id
        }
      );
    } catch (auditError) {
      console.error('Failed to log payment attempt:', auditError);
    }

    return NextResponse.json({
      success: true,
      session_url: session.url,
      session_id: session.id,
      payment_intent_id: session.payment_intent,
      expires_at: session.expires_at
    });
  } catch (error) {
    console.error('Error creating payment session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Payment processing error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}