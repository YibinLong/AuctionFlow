import { NextRequest, NextResponse } from 'next/server';
import { calculateInvoiceTotals, validateCalculationInputs } from '@/lib/calculations';
import { auditLogger } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate inputs
    const validation = validateCalculationInputs(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid inputs', details: validation.errors },
        { status: 400 }
      );
    }

    // Perform calculations
    const results = calculateInvoiceTotals(body);

    // Log calculation for audit purposes
    try {
      await auditLogger.logCalculationPerformed(
        'preview',
        'invoice_calculation',
        { inputs: body },
        { results: results.breakdown },
        undefined // Will add user ID when auth is implemented
      );
    } catch (auditError) {
      console.error('Failed to log calculation:', auditError);
    }

    return NextResponse.json({
      success: true,
      calculations: {
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
      }
    });
  } catch (error) {
    console.error('Error in calculation preview:', error);

    // Determine if it's a validation error or calculation error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Invalid') || errorMessage.includes('required')) {
      return NextResponse.json(
        { error: 'Calculation error', details: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}