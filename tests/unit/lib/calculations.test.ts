import Decimal from 'decimal.js';
import {
  calculateSubtotal,
  calculateBuyersPremium,
  calculateTax,
  calculateGrandTotal,
  calculateInvoiceTotals,
  formatCurrency,
  validateCalculationInputs
} from '@/lib/calculations';

describe('Calculations Engine', () => {
  describe('calculateSubtotal', () => {
    it('should calculate subtotal for items correctly', () => {
      const items = [
        { lot_id: '1', title: 'Item 1', quantity: 2, unit_price: 100 },
        { lot_id: '2', title: 'Item 2', quantity: 1, unit_price: 50 },
      ];

      const result = calculateSubtotal(items);
      expect(result.toNumber()).toBe(250); // (2 * 100) + (1 * 50) = 250
    });

    it('should handle empty items array', () => {
      const result = calculateSubtotal([]);
      expect(result.toNumber()).toBe(0);
    });

    it('should handle decimal prices accurately', () => {
      const items = [
        { lot_id: '1', title: 'Item 1', quantity: 1, unit_price: 99.99 },
        { lot_id: '2', title: 'Item 2', quantity: 2, unit_price: 0.50 },
      ];

      const result = calculateSubtotal(items);
      expect(result.toNumber()).toBeCloseTo(100.99, 2);
    });
  });

  describe('calculateBuyersPremium', () => {
    it('should calculate flat rate premium correctly', () => {
      const subtotal = new Decimal(1000);
      const result = calculateBuyersPremium(subtotal, 0.10);
      expect(result.amount.toNumber()).toBe(100); // 1000 * 10% = 100
    });

    it('should handle zero premium rate', () => {
      const subtotal = new Decimal(1000);
      const result = calculateBuyersPremium(subtotal, 0);
      expect(result.amount.toNumber()).toBe(0);
    });

    it('should use Decimal.js for precision', () => {
      const subtotal = new Decimal(100); // Use larger amount to avoid rounding to 0
      const result = calculateBuyersPremium(subtotal, 0.3333);
      expect(result.amount.toNumber()).toBeCloseTo(33.33, 2); // 100 * 0.3333 = 33.33, rounded to 2 decimal places
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax on subtotal plus premium', () => {
      const subtotal = new Decimal(1000);
      const buyersPremium = new Decimal(100);
      const result = calculateTax(subtotal, buyersPremium, 0.0825);
      expect(result.amount.toNumber()).toBeCloseTo(90.75, 2); // (1000 + 100) * 8.25% = 90.75
    });

    it('should handle zero tax rate', () => {
      const subtotal = new Decimal(1000);
      const buyersPremium = new Decimal(100);
      const result = calculateTax(subtotal, buyersPremium, 0);
      expect(result.amount.toNumber()).toBe(0);
    });
  });

  describe('calculateGrandTotal', () => {
    it('should calculate complete invoice total', () => {
      const subtotal = new Decimal(1000);
      const buyersPremium = new Decimal(100);
      const tax = new Decimal(90.75);

      const result = calculateGrandTotal(subtotal, buyersPremium, tax);
      expect(result.toNumber()).toBeCloseTo(1190.75, 2);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should calculate complete invoice total for multiple items', () => {
      const inputs = {
        items: [
          { lot_id: '1', title: 'Item 1', quantity: 2, unit_price: 250.50 },
          { lot_id: '2', title: 'Item 2', quantity: 1, unit_price: 99.99 },
          { lot_id: '3', title: 'Item 3', quantity: 3, unit_price: 10.00 },
        ],
        buyers_premium_rate: 0.15,
        tax_rate: 0.075,
      };

      const result = calculateInvoiceTotals(inputs);
      expect(result.subtotal.toNumber()).toBeCloseTo(630.99, 2);
      expect(result.buyers_premium_amount.toNumber()).toBeCloseTo(94.65, 2);
      expect(result.tax_amount.toNumber()).toBeCloseTo(54.42, 2);
      expect(result.grand_total.toNumber()).toBeCloseTo(780.06, 2);
      expect(result.currency).toBe('USD');
    });

    it('should throw error for empty items list', () => {
      const inputs = {
        items: [],
        buyers_premium_rate: 0.10,
        tax_rate: 0.0825,
      };

      expect(() => calculateInvoiceTotals(inputs)).toThrow('At least one item is required');
    });
  });

  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format large numbers correctly', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('should format Decimal objects correctly', () => {
      expect(formatCurrency(new Decimal(123.45))).toBe('$123.45');
    });
  });

  describe('validateCalculationInputs', () => {
    it('should validate correct inputs', () => {
      const inputs = {
        items: [
          { lot_id: '1', title: 'Item 1', quantity: 1, unit_price: 100 },
        ],
        buyers_premium_rate: 0.10,
        tax_rate: 0.0825,
      };

      const result = validateCalculationInputs(inputs);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing items', () => {
      const inputs = {
        items: [],
        buyers_premium_rate: 0.10,
        tax_rate: 0.0825,
      };

      const result = validateCalculationInputs(inputs);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one item is required');
    });

    it('should detect invalid rates', () => {
      const inputs = {
        items: [
          { lot_id: '1', title: 'Item 1', quantity: 1, unit_price: 100 },
        ],
        buyers_premium_rate: 1.5, // Invalid rate > 1
        tax_rate: -0.1, // Invalid negative rate
      };

      const result = validateCalculationInputs(inputs);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Buyer's premium rate must be between 0 and 1");
      expect(result.errors).toContain('Tax rate must be between 0 and 1');
    });

    it('should detect invalid item data', () => {
      const inputs = {
        items: [
          { lot_id: '', title: 'Item 1', quantity: 0, unit_price: -100 },
        ],
        buyers_premium_rate: 0.10,
        tax_rate: 0.0825,
      };

      const result = validateCalculationInputs(inputs);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large numbers', () => {
      const subtotal = new Decimal(999999999.99);
      const result = calculateBuyersPremium(subtotal, 0.10);
      expect(result.amount.toNumber()).toBeCloseTo(99999999.999, 2);
    });

    it('should use Decimal for precision', () => {
      // Test the classic 0.1 + 0.2 issue
      const result = new Decimal(0.1).plus(0.2);
      expect(result.toNumber()).toBeCloseTo(0.3, 10);
    });
  });
});