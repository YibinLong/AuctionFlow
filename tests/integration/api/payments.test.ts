import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/create-session/route';
import { GET } from '@/app/api/payments/session/[id]/route';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
  }));
});

// Mock dependencies
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    logPaymentAttempted: jest.fn().mockResolvedValue({}),
    logPaymentSucceeded: jest.fn().mockResolvedValue({}),
    logPaymentFailed: jest.fn().mockResolvedValue({}),
  },
}));

import Stripe from 'stripe';
import { query } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

describe('Payments API Integration Tests', () => {
  const mockStripe = new Stripe('test-key', { apiVersion: '2024-06-20' });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test-secret-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  describe('POST /api/payments/create-session', () => {
    const validPaymentData = {
      invoice_id: '1',
      success_url: 'http://localhost:3000/payment/success',
      cancel_url: 'http://localhost:3000/payment/cancel',
    };

    it('should create a Stripe checkout session successfully', async () => {
      const mockInvoice = {
        id: '1',
        invoice_number: 'INV-123',
        grand_total: '1182.50',
        status: 'pending',
      };

      const mockStripeSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        payment_status: 'unpaid',
        amount_total: 118250, // Amount in cents
        currency: 'usd',
        metadata: {
          invoice_id: '1',
          invoice_number: 'INV-123',
        },
      };

      const mockPaymentSession = {
        id: 'cs_test_123',
        invoice_id: '1',
        amount: 1182.50,
        status: 'created',
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockInvoice]) // Get invoice
        .mockResolvedValueOnce([mockPaymentSession]); // Insert payment session

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockStripeSession);

      const request = new NextRequest('http://localhost:3000/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify(validPaymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.session_id).toBe('cs_test_123');
      expect(data.payment_url).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(data.payment_session).toBeDefined();
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'usd',
                unit_amount: 118250,
                product_data: expect.objectContaining({
                  name: 'Auction Invoice INV-123',
                }),
              }),
              quantity: 1,
            }),
          ],
          mode: 'payment',
          metadata: {
            invoice_id: '1',
            invoice_number: 'INV-123',
          },
        })
      );
      expect(auditLogger.logPaymentAttempted).toHaveBeenCalled();
    });

    it('should return 400 when invoice_id is missing', async () => {
      const invalidData = {
        success_url: 'http://localhost:3000/payment/success',
        cancel_url: 'http://localhost:3000/payment/cancel',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invoice ID is required');
    });

    it('should return 404 when invoice not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce([]); // No invoice found

      const request = new NextRequest('http://localhost:3000/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: '999',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Invoice not found or already processed');
    });

    it('should return 404 when invoice is already paid', async () => {
      const mockPaidInvoice = {
        id: '1',
        status: 'paid', // Already paid
      };

      (query as jest.Mock).mockResolvedValueOnce([mockPaidInvoice]);

      const request = new NextRequest('http://localhost:3000/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: '1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it('should handle Stripe API errors', async () => {
      const mockInvoice = {
        id: '1',
        grand_total: '1000.00',
        status: 'pending',
      };

      (query as jest.Mock).mockResolvedValueOnce([mockInvoice]);
      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const request = new NextRequest('http://localhost:3000/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: '1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should support custom payment methods', async () => {
      const mockInvoice = {
        id: '1',
        grand_total: '1000.00',
        status: 'pending',
        invoice_number: 'INV-123',
      };

      const mockPaymentSession = {
        id: 'cs_test_123',
        invoice_id: '1',
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockInvoice])
        .mockResolvedValueOnce([mockPaymentSession]);

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      const request = new NextRequest('http://localhost:3000/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: '1',
          payment_method_types: ['card', 'apple_pay', 'google_pay'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card', 'apple_pay', 'google_pay'],
        })
      );
    });
  });

  describe('GET /api/payments/session/[id]', () => {
    it('should return payment session status', async () => {
      const mockPaymentSession = {
        id: 'cs_test_123',
        invoice_id: '1',
        amount: 1182.50,
        currency: 'usd',
        status: 'created',
        invoice_status: 'pending',
        created_at: new Date(),
      };

      const mockStripeSession = {
        id: 'cs_test_123',
        status: 'complete',
        payment_status: 'paid',
        amount_total: 118250,
        currency: 'usd',
        success_url: 'http://localhost:3000/payment/success',
        cancel_url: 'http://localhost:3000/payment/cancel',
      };

      (query as jest.Mock).mockResolvedValueOnce([mockPaymentSession]);
      (mockStripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(mockStripeSession);

      const request = new NextRequest('http://localhost:3000/api/payments/session/cs_test_123');
      const response = await GET(request, { params: { id: 'cs_test_123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session.id).toBe('cs_test_123');
      expect(data.session.amount).toBe(1182.50);
      expect(data.stripe_session.payment_status).toBe('paid');
    });

    it('should return 400 when session ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/session/');
      const response = await GET(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
    });

    it('should return 404 when payment session not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/payments/session/cs_nonexistent');
      const response = await GET(request, { params: { id: 'cs_nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('should update invoice status when payment is completed', async () => {
      const mockPaymentSession = {
        id: 'cs_test_123',
        invoice_id: '1',
        amount: 1182.50,
        currency: 'usd',
        status: 'created', // Will be updated to 'completed'
        invoice_status: 'pending', // Will be updated to 'paid'
      };

      const mockStripeSession = {
        id: 'cs_test_123',
        status: 'complete',
        payment_status: 'paid', // This should trigger invoice update
        amount_total: 118250,
        currency: 'usd',
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockPaymentSession]) // Get payment session
        .mockResolvedValueOnce([]) // Update payment session
        .mockResolvedValueOnce([]); // Update invoice

      (mockStripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(mockStripeSession);

      const request = new NextRequest('http://localhost:3000/api/payments/session/cs_test_123');
      const response = await GET(request, { params: { id: 'cs_test_123' } });

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payment_sessions'),
        expect.arrayContaining(['completed', 'paid'])
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE invoices'),
        expect.arrayContaining(['paid', 'stripe'])
      );
      expect(auditLogger.logPaymentSucceeded).toHaveBeenCalled();
    });

    it('should handle expired sessions', async () => {
      const mockPaymentSession = {
        id: 'cs_test_123',
        invoice_id: '1',
        status: 'created',
        invoice_status: 'pending',
      };

      const mockStripeSession = {
        id: 'cs_test_123',
        status: 'expired',
        payment_status: 'unpaid',
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockPaymentSession])
        .mockResolvedValueOnce([]);

      (mockStripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(mockStripeSession);

      const request = new NextRequest('http://localhost:3000/api/payments/session/cs_test_123');
      const response = await GET(request, { params: { id: 'cs_test_123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session.status).toBe('expired');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payment_sessions'),
        expect.arrayContaining(['expired', 'unpaid'])
      );
    });

    it('should handle Stripe API errors gracefully', async () => {
      const mockPaymentSession = {
        id: 'cs_test_123',
        invoice_id: '1',
        status: 'created',
      };

      (query as jest.Mock).mockResolvedValueOnce([mockPaymentSession]);
      (mockStripe.checkout.sessions.retrieve as jest.Mock).mockRejectedValue(
        new Error('Stripe session not found')
      );

      const request = new NextRequest('http://localhost:3000/api/payments/session/cs_test_123');
      const response = await GET(request, { params: { id: 'cs_test_123' } });

      expect(response.status).toBe(500);
    });
  });
});