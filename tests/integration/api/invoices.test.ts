import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/invoices/route';
import { GET as GetInvoice, PUT as UpdateInvoice } from '@/app/api/invoices/[id]/route';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/calculations', () => ({
  calculateInvoiceTotals: jest.fn(),
}));

jest.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    logInvoiceViewed: jest.fn().mockResolvedValue({}),
    logInvoiceCreated: jest.fn().mockResolvedValue({}),
    logInvoiceUpdated: jest.fn().mockResolvedValue({}),
  },
}));

import { query } from '@/lib/db';
import { calculateInvoiceTotals } from '@/lib/calculations';
import { auditLogger } from '@/lib/audit-logger';

describe('Invoice API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/invoices', () => {
    it('should return invoice data when valid ID is provided', async () => {
      const mockInvoice = {
        id: '1',
        invoice_number: 'INV-123',
        subtotal: '1000.00',
        buyers_premium_amount: '100.00',
        tax_amount: '82.50',
        grand_total: '1182.50',
        status: 'pending',
        buyer_id: 'buyer-123',
        auction_item_id: 'item-123',
      };

      const mockItems = [
        {
          id: '1',
          invoice_id: '1',
          auction_item_id: 'item-123',
          quantity: 2,
          unit_price: '500.00',
          total_price: '1000.00',
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce([mockInvoice])
        .mockResolvedValueOnce(mockItems);

      const request = new NextRequest('http://localhost:3000/api/invoices?id=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoice).toBeDefined();
      expect(data.invoice.id).toBe('1');
      expect(data.invoice.items).toHaveLength(1);
      expect(auditLogger.logInvoiceViewed).toHaveBeenCalledWith('1');
    });

    it('should return 400 when invoice ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invoice ID is required');
    });

    it('should return 404 when invoice not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/invoices?id=999');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Invoice not found');
    });

    it('should handle database errors gracefully', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/invoices?id=1');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/invoices', () => {
    const validInvoiceData = {
      auction_item_id: 'item-123',
      buyer_id: 'buyer-123',
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

    it('should create a new invoice successfully', async () => {
      const mockCalculationResult = {
        subtotal: { toNumber: () => 1000 },
        buyers_premium_amount: { toNumber: () => 100 },
        tax_amount: { toNumber: () => 82.5 },
        grand_total: { toNumber: () => 1182.5 },
      };

      const mockCreatedInvoice = {
        id: 'new-invoice-id',
        invoice_number: 'INV-123456789',
        status: 'pending',
      };

      (calculateInvoiceTotals as jest.Mock).mockReturnValue(mockCalculationResult);
      (query as jest.Mock)
        .mockResolvedValueOnce([mockCreatedInvoice]) // Insert invoice
        .mockResolvedValueOnce([]); // Insert invoice items

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(validInvoiceData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.invoice).toBeDefined();
      expect(data.invoice.invoice_number).toMatch(/^INV-\d+-\d+$/);
      expect(calculateInvoiceTotals).toHaveBeenCalledWith(validInvoiceData);
      expect(auditLogger.logInvoiceCreated).toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      const invalidData = {
        buyer_id: 'buyer-123',
        // Missing auction_item_id and items
      };

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle empty items array', async () => {
      const invalidData = {
        auction_item_id: 'item-123',
        buyer_id: 'buyer-123',
        items: [],
      };

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('PUT /api/invoices/[id]', () => {
    it('should update invoice status successfully', async () => {
      const mockInvoice = {
        id: '1',
        status: 'pending',
      };

      const mockUpdatedInvoice = {
        id: '1',
        status: 'paid',
        payment_method: 'stripe',
        updated_at: new Date(),
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockInvoice]) // Get current invoice
        .mockResolvedValueOnce([mockUpdatedInvoice]); // Update invoice

      const request = new NextRequest('http://localhost:3000/api/invoices/1', {
        method: 'PUT',
        body: JSON.stringify({
          status: 'paid',
          payment_method: 'stripe',
          notes: 'Payment completed',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await UpdateInvoice(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoice.status).toBe('paid');
      expect(auditLogger.logInvoiceUpdated).toHaveBeenCalled();
    });

    it('should return 404 when invoice not found for update', async () => {
      (query as jest.Mock).mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/invoices/999', {
        method: 'PUT',
        body: JSON.stringify({ status: 'paid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await UpdateInvoice(request, { params: { id: '999' } });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/invoices/[id]', () => {
    it('should fetch individual invoice', async () => {
      const mockInvoice = {
        id: '1',
        invoice_number: 'INV-123',
        subtotal: '1000.00',
        buyers_premium_amount: '100.00',
        tax_amount: '82.50',
        grand_total: '1182.50',
        status: 'pending',
      };

      const mockItems = [
        {
          id: '1',
          invoice_id: '1',
          quantity: 1,
          unit_price: '1000.00',
          item_title: 'Test Item',
          lot_number: 'LOT-001',
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce([mockInvoice])
        .mockResolvedValueOnce(mockItems);

      const request = new NextRequest('http://localhost:3000/api/invoices/1');
      const response = await GetInvoice(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoice).toBeDefined();
      expect(data.invoice.items).toHaveLength(1);
      expect(auditLogger.logInvoiceViewed).toHaveBeenCalledWith('1');
    });

    it('should return 400 when invoice ID is missing in dynamic route', async () => {
      const request = new NextRequest('http://localhost:3000/api/invoices/');
      const response = await GetInvoice(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invoice ID is required');
    });
  });
});