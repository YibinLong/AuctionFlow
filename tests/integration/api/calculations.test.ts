import { NextRequest } from 'next/server';
import { POST } from '@/app/api/calculations/preview/route';
import { GET } from '@/app/api/calculations/rates/route';

// Mock dependencies
jest.mock('@/lib/calculations', () => ({
  calculateInvoiceTotals: jest.fn(),
  validateCalculationInputs: jest.fn(),
}));

jest.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    logCalculationPerformed: jest.fn().mockResolvedValue({}),
  },
}));

import { calculateInvoiceTotals, validateCalculationInputs } from '@/lib/calculations';
import { auditLogger } from '@/lib/audit-logger';
import Decimal from 'decimal.js';

describe('Calculations API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/calculations/preview', () => {
    const validCalculationData = {
      items: [
        {
          lot_id: 'LOT-001',
          title: 'Test Item',
          quantity: 1,
          unit_price: 1000,
        },
      ],
      buyers_premium_rate: 0.10,
      tax_rate: 0.0825,
    };

    it('should return calculation preview for valid inputs', async () => {
      const mockValidation = {
        valid: true,
        errors: [],
      };

      const mockCalculationResult = {
        subtotal: new Decimal(1000),
        buyers_premium_amount: new Decimal(100),
        tax_amount: new Decimal(90.75),
        grand_total: new Decimal(1190.75),
        currency: 'USD',
        breakdown: {
          items: [
            {
              lot_id: 'LOT-001',
              title: 'Test Item',
              quantity: 1,
              unit_price: new Decimal(1000),
              total_price: new Decimal(1000),
            },
          ],
          buyers_premium: {
            rate: new Decimal(0.10),
            amount: new Decimal(100),
          },
          tax: {
            rate: new Decimal(0.0825),
            taxable_amount: new Decimal(1100),
            amount: new Decimal(90.75),
          },
        },
      };

      (validateCalculationInputs as jest.Mock).mockReturnValue(mockValidation);
      (calculateInvoiceTotals as jest.Mock).mockReturnValue(mockCalculationResult);

      const request = new NextRequest('http://localhost:3000/api/calculations/preview', {
        method: 'POST',
        body: JSON.stringify(validCalculationData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subtotal).toBe(1000);
      expect(data.buyers_premium_amount).toBe(100);
      expect(data.tax_amount).toBe(90.75);
      expect(data.grand_total).toBe(1190.75);
      expect(data.currency).toBe('USD');
      expect(data.breakdown.items).toHaveLength(1);
      expect(auditLogger.logCalculationPerformed).toHaveBeenCalled();
    });

    it('should return 400 for invalid inputs', async () => {
      const mockValidation = {
        valid: false,
        errors: ['Items array is empty', 'Invalid tax rate'],
      };

      (validateCalculationInputs as jest.Mock).mockReturnValue(mockValidation);

      const request = new NextRequest('http://localhost:3000/api/calculations/preview', {
        method: 'POST',
        body: JSON.stringify({
          items: [],
          tax_rate: -0.1, // Invalid negative rate
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Items array is empty');
      expect(data.details).toContain('Invalid tax rate');
    });

    it('should handle calculation engine errors', async () => {
      const mockValidation = {
        valid: true,
        errors: [],
      };

      (validateCalculationInputs as jest.Mock).mockReturnValue(mockValidation);
      (calculateInvoiceTotals as jest.Mock).mockImplementation(() => {
        throw new Error('Calculation engine failed');
      });

      const request = new NextRequest('http://localhost:3000/api/calculations/preview', {
        method: 'POST',
        body: JSON.stringify(validCalculationData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Calculation engine failed');
    });

    it('should handle complex calculation scenarios', async () => {
      const complexCalculationData = {
        items: [
          {
            lot_id: 'LOT-001',
            title: 'High Value Item',
            quantity: 1,
            unit_price: 50000,
          },
          {
            lot_id: 'LOT-002',
            title: 'Low Value Item',
            quantity: 3,
            unit_price: 100,
          },
        ],
        buyers_premium_rate: 0.15,
        tax_rate: 0.08,
        premium_tiers: [
          {
            id: 'tier1',
            name: 'Standard',
            min_amount: 0,
            max_amount: 10000,
            rate: 0.10,
          },
          {
            id: 'tier2',
            name: 'Premium',
            min_amount: 10000,
            max_amount: null,
            rate: 0.15,
          },
        ],
      };

      const mockValidation = {
        valid: true,
        errors: [],
      };

      const mockCalculationResult = {
        subtotal: new Decimal(50300),
        buyers_premium_amount: new Decimal(7545), // 15% of 50300
        tax_amount: new Decimal(4627.2), // 8% of (50300 + 7545)
        grand_total: new Decimal(62472.2),
        currency: 'USD',
        breakdown: {
          items: [
            {
              lot_id: 'LOT-001',
              title: 'High Value Item',
              quantity: 1,
              unit_price: new Decimal(50000),
              total_price: new Decimal(50000),
            },
            {
              lot_id: 'LOT-002',
              title: 'Low Value Item',
              quantity: 3,
              unit_price: new Decimal(100),
              total_price: new Decimal(300),
            },
          ],
          buyers_premium: {
            rate: new Decimal(0.15),
            amount: new Decimal(7545),
            applied_tier: {
              id: 'tier2',
              name: 'Premium',
              min_amount: 10000,
              rate: 0.15,
            },
          },
          tax: {
            rate: new Decimal(0.08),
            taxable_amount: new Decimal(57845),
            amount: new Decimal(4627.2),
          },
        },
      };

      (validateCalculationInputs as jest.Mock).mockReturnValue(mockValidation);
      (calculateInvoiceTotals as jest.Mock).mockReturnValue(mockCalculationResult);

      const request = new NextRequest('http://localhost:3000/api/calculations/preview', {
        method: 'POST',
        body: JSON.stringify(complexCalculationData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.grand_total).toBe(62472.2);
      expect(data.breakdown.buyers_premium.applied_tier.id).toBe('tier2');
      expect(auditLogger.logCalculationPerformed).toHaveBeenCalledWith(
        'preview',
        'invoice_preview',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('GET /api/calculations/rates', () => {
    it('should return default rates when database is not available', async () => {
      // Mock query to throw error (simulating no database connection)
      const { query } = require('@/lib/db');
      query.mockRejectedValue(new Error('Database not available'));

      const request = new NextRequest('http://localhost:3000/api/calculations/rates');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.buyers_premium_rate).toBe(0.10);
      expect(data.tax_rate).toBe(0.085);
      expect(data.currency).toBe('USD');
      expect(data.premium_tiers).toHaveLength(1);
      expect(data.premium_tiers[0].rate).toBe(0.10);
    });

    it('should return configured rates from database', async () => {
      const { query } = require('@/lib/db');

      // Mock database responses
      query
        .mockResolvedValueOnce([{
          buyers_premium_rate: '0.12',
          tax_rate: '0.08',
          currency: 'USD',
        }])
        .mockResolvedValueOnce([
          {
            id: 'tier1',
            name: 'Basic',
            min_amount: '0',
            max_amount: '5000',
            rate: '0.08',
            is_active: true,
          },
          {
            id: 'tier2',
            name: 'Premium',
            min_amount: '5000',
            max_amount: null,
            rate: '0.12',
            is_active: true,
          },
        ]);

      const request = new NextRequest('http://localhost:3000/api/calculations/rates');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.buyers_premium_rate).toBe(0.12);
      expect(data.tax_rate).toBe(0.08);
      expect(data.premium_tiers).toHaveLength(2);
      expect(data.premium_tiers[0].rate).toBe(0.08);
      expect(data.premium_tiers[1].rate).toBe(0.12);
    });

    it('should handle database errors gracefully', async () => {
      const { query } = require('@/lib/db');
      query.mockRejectedValue(new Error('Connection timeout'));

      const request = new NextRequest('http://localhost:3000/api/calculations/rates');
      const response = await GET(request);

      expect(response.status).toBe(200); // Should still return default rates
      // Console error should be logged but not fail the request
    });
  });
});