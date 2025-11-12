import Decimal from 'decimal.js';
import { InvoiceItem, PremiumTier } from './types';
import { auditLogger } from './audit-logger';

// Configure Decimal for financial calculations
Decimal.set({
  rounding: Decimal.ROUND_HALF_EVEN, // Bankers rounding
  precision: 28, // Sufficient precision for financial calculations
  modulo: Decimal.ROUND_DOWN,
  toExpNeg: -7,
  toExpPos: 21
});

export interface CalculationInputs {
  items: Array<{
    lot_id: string;
    title: string;
    quantity: number;
    unit_price: number | string;
  }>;
  buyers_premium_rate?: number | string;
  tax_rate?: number | string;
  premium_tiers?: PremiumTier[];
}

export interface CalculationResults {
  subtotal: Decimal;
  buyers_premium_amount: Decimal;
  tax_amount: Decimal;
  grand_total: Decimal;
  currency: string;
  breakdown: {
    items: Array<{
      lot_id: string;
      title: string;
      quantity: number;
      unit_price: Decimal;
      total_price: Decimal;
    }>;
    buyers_premium: {
      rate: Decimal;
      amount: Decimal;
      applied_tier?: PremiumTier;
    };
    tax: {
      rate: Decimal;
      taxable_amount: Decimal;
      amount: Decimal;
    };
  };
}

/**
 * Calculate subtotal from items
 */
export function calculateSubtotal(items: CalculationInputs['items']): Decimal {
  if (!items || items.length === 0) {
    return new Decimal(0);
  }

  return items.reduce((subtotal, item) => {
    const quantity = new Decimal(item.quantity || 0);
    const unitPrice = new Decimal(item.unit_price || 0);

    if (quantity.lessThan(0) || unitPrice.lessThan(0)) {
      throw new Error(`Invalid item data: quantity and unit_price must be non-negative (lot: ${item.lot_id})`);
    }

    return subtotal.plus(quantity.times(unitPrice));
  }, new Decimal(0));
}

/**
 * Calculate buyer's premium with tiered rates support
 */
export function calculateBuyersPremium(
  subtotal: Decimal,
  rate?: number | string,
  tiers?: PremiumTier[]
): { amount: Decimal; appliedRate: Decimal; appliedTier?: PremiumTier } {
  const defaultRate = new Decimal(0.10); // 10% default

  // If tiers are provided, use tiered calculation
  if (tiers && tiers.length > 0) {
    return calculateTieredBuyersPremium(subtotal, tiers);
  }

  // Otherwise use flat rate (explicitly handle rate = 0)
  const premiumRate = rate !== undefined ? new Decimal(rate) : defaultRate;

  if (premiumRate.lessThan(0) || premiumRate.greaterThan(1)) {
    throw new Error(`Invalid buyer's premium rate: ${rate}. Rate must be between 0 and 1.`);
  }

  const amount = subtotal.times(premiumRate);

  return {
    amount: amount.toDecimalPlaces(2),
    appliedRate: premiumRate
  };
}

/**
 * Calculate tiered buyer's premium
 */
function calculateTieredBuyersPremium(subtotal: Decimal, tiers: PremiumTier[]): { amount: Decimal; appliedRate: Decimal; appliedTier?: PremiumTier } {
  // Sort tiers by min_amount
  const sortedTiers = [...tiers].sort((a, b) => a.min_amount - b.min_amount);

  // Find applicable tier
  const applicableTier = sortedTiers.find(tier =>
    subtotal.greaterThanOrEqualTo(tier.min_amount) &&
    (!tier.max_amount || subtotal.lessThan(tier.max_amount))
  );

  if (applicableTier) {
    const rate = new Decimal(applicableTier.rate);
    const amount = subtotal.times(rate);

    return {
      amount: amount.toDecimalPlaces(2),
      appliedRate: rate,
      appliedTier: applicableTier
    };
  }

  // If no tier matches, use default rate
  const defaultRate = new Decimal(0.10);
  const amount = subtotal.times(defaultRate);

  return {
    amount: amount.toDecimalPlaces(2),
    appliedRate: defaultRate
  };
}

/**
 * Calculate tax on subtotal plus buyer's premium
 */
export function calculateTax(
  subtotal: Decimal,
  buyersPremium: Decimal,
  rate?: number | string
): { amount: Decimal; appliedRate: Decimal; taxableAmount: Decimal } {
  const defaultRate = new Decimal(0.085); // 8.5% default
  const taxRate = rate !== undefined ? new Decimal(rate) : defaultRate;

  if (taxRate.lessThan(0) || taxRate.greaterThan(1)) {
    throw new Error(`Invalid tax rate: ${rate}. Rate must be between 0 and 1.`);
  }

  const taxableAmount = subtotal.plus(buyersPremium);
  const amount = taxableAmount.times(taxRate);

  return {
    amount: amount.toDecimalPlaces(2),
    appliedRate: taxRate,
    taxableAmount
  };
}

/**
 * Calculate grand total including all fees
 */
export function calculateGrandTotal(
  subtotal: Decimal,
  buyersPremium: Decimal,
  tax: Decimal
): Decimal {
  return subtotal.plus(buyersPremium).plus(tax).toDecimalPlaces(2);
}

/**
 * Perform complete calculation for invoice with accuracy monitoring
 */
export function calculateInvoiceTotals(inputs: CalculationInputs, options?: {
  invoiceId?: string;
  userId?: string;
  skipAuditLogging?: boolean;
}): CalculationResults {
  const startTime = Date.now();
  let calculationError: string | undefined;

  try {
    // Validate inputs
    if (!inputs.items || inputs.items.length === 0) {
      throw new Error('At least one item is required for calculation');
    }

    // Calculate subtotal
    const subtotal = calculateSubtotal(inputs.items);

    if (subtotal.equals(0)) {
      throw new Error('Subtotal cannot be zero');
    }

    // Calculate buyer's premium
    const premiumResult = calculateBuyersPremium(
      subtotal,
      inputs.buyers_premium_rate,
      inputs.premium_tiers
    );

    // Calculate tax
    const taxResult = calculateTax(subtotal, premiumResult.amount, inputs.tax_rate);

    // Calculate grand total
    const grandTotal = calculateGrandTotal(subtotal, premiumResult.amount, taxResult.amount);

    // Verify calculation accuracy with checksum
    const verificationResult = verifyCalculationAccuracy({
      subtotal,
      buyersPremium: premiumResult.amount,
      tax: taxResult.amount,
      grandTotal
    });

    if (!verificationResult.accurate) {
      calculationError = verificationResult.error;
      throw new Error(`Calculation accuracy check failed: ${verificationResult.error}`);
    }

    // Create detailed breakdown
    const breakdown = {
      items: inputs.items.map(item => ({
        lot_id: item.lot_id,
        title: item.title,
        quantity: item.quantity,
        unit_price: new Decimal(item.unit_price),
        total_price: new Decimal(item.unit_price).times(item.quantity).toDecimalPlaces(2)
      })),
      buyers_premium: {
        rate: premiumResult.appliedRate,
        amount: premiumResult.amount,
        applied_tier: premiumResult.appliedTier
      },
      tax: {
        rate: taxResult.appliedRate,
        taxable_amount: taxResult.taxableAmount,
        amount: taxResult.amount
      }
    };

    const results = {
      subtotal,
      buyers_premium_amount: premiumResult.amount,
      tax_amount: taxResult.amount,
      grand_total: grandTotal,
      currency: 'USD',
      breakdown
    };

    // Log successful calculation for audit trail
    if (!options?.skipAuditLogging) {
      const processingTimeMs = Date.now() - startTime;

      auditLogger.log({
        event_type: 'calculation_performed',
        entity_type: 'calculation',
        entity_id: options?.invoiceId,
        user_id: options?.userId,
        processing_time_ms: processingTimeMs,
        metadata: {
          calculation_type: 'invoice_total',
          inputs: {
            item_count: inputs.items.length,
            buyers_premium_rate: inputs.buyers_premium_rate,
            tax_rate: inputs.tax_rate,
            has_tiers: !!(inputs.premium_tiers && inputs.premium_tiers.length > 0)
          },
          results: {
            subtotal: subtotal.toNumber(),
            buyers_premium: premiumResult.amount.toNumber(),
            tax: taxResult.amount.toNumber(),
            grand_total: grandTotal.toNumber()
          },
          verification: verificationResult,
          calculation_checksum: generateCalculationChecksum(results)
        }
      }).catch(error => {
        console.warn('Failed to log calculation audit event:', error);
      });
    }

    return results;

  } catch (error) {
    // Log failed calculation for audit trail
    if (!options?.skipAuditLogging) {
      const processingTimeMs = Date.now() - startTime;

      auditLogger.log({
        event_type: 'calculation_performed',
        entity_type: 'calculation',
        entity_id: options?.invoiceId,
        user_id: options?.userId,
        processing_time_ms: processingTimeMs,
        metadata: {
          calculation_type: 'invoice_total',
          calculation_error: calculationError || (error instanceof Error ? error.message : 'Unknown error'),
          inputs: {
            item_count: inputs.items?.length || 0,
            buyers_premium_rate: inputs.buyers_premium_rate,
            tax_rate: inputs.tax_rate
          }
        }
      }).catch(logError => {
        console.warn('Failed to log calculation audit event:', logError);
      });
    }

    throw error;
  }
}

/**
 * Format decimal as currency string
 */
export function formatCurrency(amount: Decimal | number | string, currency: string = 'USD'): string {
  const decimalAmount = new Decimal(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(decimalAmount.toNumber());
}

/**
 * Validate calculation inputs
 */
export function validateCalculationInputs(inputs: CalculationInputs): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!inputs.items || inputs.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    inputs.items.forEach((item, index) => {
      if (!item.lot_id) errors.push(`Item ${index + 1}: lot_id is required`);
      if (!item.title) errors.push(`Item ${index + 1}: title is required`);
      if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: quantity must be greater than 0`);
      if (!item.unit_price || parseFloat(item.unit_price.toString()) <= 0) errors.push(`Item ${index + 1}: unit_price must be greater than 0`);
    });
  }

  if (inputs.buyers_premium_rate !== undefined) {
    const rate = new Decimal(inputs.buyers_premium_rate);
    if (rate.lessThan(0) || rate.greaterThan(1)) {
      errors.push("Buyer's premium rate must be between 0 and 1");
    }
  }

  if (inputs.tax_rate !== undefined) {
    const rate = new Decimal(inputs.tax_rate);
    if (rate.lessThan(0) || rate.greaterThan(1)) {
      errors.push('Tax rate must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Verify calculation accuracy with checksum
 */
export function verifyCalculationAccuracy(values: {
  subtotal: Decimal;
  buyersPremium: Decimal;
  tax: Decimal;
  grandTotal: Decimal;
}): { accurate: boolean; error?: string } {
  try {
    // Recalculate expected grand total
    const expectedGrandTotal = values.subtotal.plus(values.buyersPremium).plus(values.tax);

    // Compare with actual grand total (allowing for decimal precision differences)
    const difference = expectedGrandTotal.minus(values.grandTotal).absoluteValue();

    // Allow for very small precision differences (less than 0.01)
    const tolerance = new Decimal('0.01');

    if (difference.greaterThan(tolerance)) {
      return {
        accurate: false,
        error: `Grand total mismatch: expected ${expectedGrandTotal.toDecimalPlaces(2)}, got ${values.grandTotal.toDecimalPlaces(2)} (difference: ${difference})`
      };
    }

    // Verify all amounts are positive (or zero)
    if (values.subtotal.lessThan(0)) {
      return {
        accurate: false,
        error: `Subtotal cannot be negative: ${values.subtotal}`
      };
    }

    if (values.buyersPremium.lessThan(0)) {
      return {
        accurate: false,
        error: `Buyer's premium cannot be negative: ${values.buyersPremium}`
      };
    }

    if (values.tax.lessThan(0)) {
      return {
        accurate: false,
        error: `Tax cannot be negative: ${values.tax}`
      };
    }

    if (values.grandTotal.lessThan(0)) {
      return {
        accurate: false,
        error: `Grand total cannot be negative: ${values.grandTotal}`
      };
    }

    // Verify grand total is the sum of all components
    const totalCheck = values.subtotal.plus(values.buyersPremium).plus(values.tax);
    const totalDifference = totalCheck.minus(values.grandTotal).absoluteValue();

    if (totalDifference.greaterThan(tolerance)) {
      return {
        accurate: false,
        error: `Component sum check failed: ${values.subtotal} + ${values.buyersPremium} + ${values.tax} = ${totalCheck}, but grand total is ${values.grandTotal}`
      };
    }

    return { accurate: true };

  } catch (error) {
    return {
      accurate: false,
      error: `Accuracy verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate checksum for calculation results
 */
export function generateCalculationChecksum(results: CalculationResults): string {
  try {
    // Create a hash string from key calculation values
    const hashInput = [
      results.subtotal.toFixed(2),
      results.buyers_premium_amount.toFixed(2),
      results.tax_amount.toFixed(2),
      results.grand_total.toFixed(2),
      results.currency
    ].join('|');

    // Simple hash function (for production, consider using crypto)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  } catch (error) {
    return `checksum_error_${Date.now()}`;
  }
}

/**
 * Perform automated accuracy verification test
 */
export async function performAutomatedAccuracyTest(): Promise<{
  test_passed: boolean;
  test_results: Array<{
    test_name: string;
    passed: boolean;
    error?: string;
    input_data: any;
    expected_output: any;
    actual_output: any;
  }>;
}> {
  const testCases = [
    {
      name: 'Simple calculation test',
      inputs: {
        items: [
          { lot_id: 'test1', title: 'Test Item 1', quantity: 1, unit_price: 100.00 }
        ],
        buyers_premium_rate: 0.10,
        tax_rate: 0.085
      },
      expected: {
        subtotal: 100.00,
        buyers_premium: 10.00,
        tax: 9.35, // (100 + 10) * 0.085
        grand_total: 119.35
      }
    },
    {
      name: 'Multiple items test',
      inputs: {
        items: [
          { lot_id: 'test1', title: 'Test Item 1', quantity: 2, unit_price: 50.00 },
          { lot_id: 'test2', title: 'Test Item 2', quantity: 1, unit_price: 75.00 }
        ],
        buyers_premium_rate: 0.15,
        tax_rate: 0.08
      },
      expected: {
        subtotal: 175.00, // (2 * 50) + 75
        buyers_premium: 26.25, // 175 * 0.15
        tax: 16.10, // (175 + 26.25) * 0.08
        grand_total: 217.35
      }
    },
    {
      name: 'Zero rates test',
      inputs: {
        items: [
          { lot_id: 'test1', title: 'Test Item 1', quantity: 1, unit_price: 200.00 }
        ],
        buyers_premium_rate: 0,
        tax_rate: 0
      },
      expected: {
        subtotal: 200.00,
        buyers_premium: 0,
        tax: 0,
        grand_total: 200.00
      }
    }
  ];

  const testResults = [];
  let allTestsPassed = true;

  for (const testCase of testCases) {
    try {
      // Calculate using our function
      const actualResult = calculateInvoiceTotals(testCase.inputs, { skipAuditLogging: true });

      // Convert to numbers for comparison
      const actual = {
        subtotal: actualResult.subtotal.toNumber(),
        buyers_premium: actualResult.buyers_premium_amount.toNumber(),
        tax: actualResult.tax_amount.toNumber(),
        grand_total: actualResult.grand_total.toNumber()
      };

      // Verify accuracy
      const verification = verifyCalculationAccuracy({
        subtotal: actualResult.subtotal,
        buyersPremium: actualResult.buyers_premium_amount,
        tax: actualResult.tax_amount,
        grandTotal: actualResult.grand_total
      });

      // Compare with expected values (allowing for small floating point differences)
      const tolerance = 0.01;
      const passed = verification.accurate &&
        Math.abs(actual.subtotal - testCase.expected.subtotal) <= tolerance &&
        Math.abs(actual.buyers_premium - testCase.expected.buyers_premium) <= tolerance &&
        Math.abs(actual.tax - testCase.expected.tax) <= tolerance &&
        Math.abs(actual.grand_total - testCase.expected.grand_total) <= tolerance;

      testResults.push({
        test_name: testCase.name,
        passed,
        error: passed ? undefined : verification.error || 'Values do not match expected',
        input_data: testCase.inputs,
        expected_output: testCase.expected,
        actual_output: actual
      });

      if (!passed) {
        allTestsPassed = false;
      }

    } catch (error) {
      testResults.push({
        test_name: testCase.name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        input_data: testCase.inputs,
        expected_output: testCase.expected,
        actual_output: null
      });
      allTestsPassed = false;
    }
  }

  // Log the automated test
  await auditLogger.log({
    event_type: 'calculation_accuracy_test',
    entity_type: 'system',
    metadata: {
      test_passed: allTestsPassed,
      test_count: testCases.length,
      passed_tests: testResults.filter(r => r.passed).length,
      failed_tests: testResults.filter(r => !r.passed).length,
      test_results
    }
  }).catch(error => {
    console.warn('Failed to log accuracy test:', error);
  });

  return {
    test_passed: allTestsPassed,
    test_results: testResults
  };
}