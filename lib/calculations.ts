import Decimal from 'decimal.js';
import { InvoiceItem, PremiumTier } from './types';

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
 * Perform complete calculation for invoice
 */
export function calculateInvoiceTotals(inputs: CalculationInputs): CalculationResults {
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

  return {
    subtotal,
    buyers_premium_amount: premiumResult.amount,
    tax_amount: taxResult.amount,
    grand_total: grandTotal,
    currency: 'USD',
    breakdown
  };
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