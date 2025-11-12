import { NextRequest, NextResponse } from 'next/server';
import { calculateInvoiceTotals, validateCalculationInputs } from '@/lib/calculations';
import { auditLogger } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      buyers_premium_rate,
      tax_rate,
      premium_tiers
    } = body;

    // Validate inputs
    const validation = validateCalculationInputs({
      items,
      buyers_premium_rate,
      tax_rate,
      premium_tiers
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Perform calculation
    const results = calculateInvoiceTotals({
      items,
      buyers_premium_rate,
      tax_rate,
      premium_tiers
    });

    // Log calculation for audit
    await auditLogger.logCalculationPerformed(
      'preview',
      'invoice_preview',
      { items, buyers_premium_rate, tax_rate, premium_tiers },
      {
        subtotal: results.subtotal.toNumber(),
        buyers_premium_amount: results.buyers_premium_amount.toNumber(),
        tax_amount: results.tax_amount.toNumber(),
        grand_total: results.grand_total.toNumber()
      }
    );

    // Convert Decimal objects to plain numbers for JSON serialization
    const response = {
      subtotal: results.subtotal.toNumber(),
      buyers_premium_amount: results.buyers_premium_amount.toNumber(),
      tax_amount: results.tax_amount.toNumber(),
      grand_total: results.grand_total.toNumber(),
      currency: results.currency,
      breakdown: {
        items: results.breakdown.items.map(item => ({
          ...item,
          unit_price: item.unit_price.toNumber(),
          total_price: item.total_price.toNumber()
        })),
        buyers_premium: {
          rate: results.breakdown.buyers_premium.rate.toNumber(),
          amount: results.breakdown.buyers_premium.amount.toNumber(),
          applied_tier: results.breakdown.buyers_premium.applied_tier
        },
        tax: {
          rate: results.breakdown.tax.rate.toNumber(),
          taxable_amount: results.breakdown.tax.taxable_amount.toNumber(),
          amount: results.breakdown.tax.amount.toNumber()
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in calculation preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calculation failed' },
      { status: 500 }
    );
  }
}