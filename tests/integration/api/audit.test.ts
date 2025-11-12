import { NextRequest } from 'next/server';
import { GET } from '@/app/api/audit/invoices/[id]/route';
import { GET as GetTransactionLogs } from '@/app/api/audit/transactions/[id]/route';

// Mock dependencies
jest.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    getEntityLogs: jest.fn(),
    getUserLogs: jest.fn(),
    getLogsByCorrelationId: jest.fn(),
    exportLogs: jest.fn(),
  },
}));

import { auditLogger } from '@/lib/audit-logger';

describe('Audit API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/audit/invoices/[id]', () => {
    it('should return audit logs for a specific invoice', async () => {
      const mockAuditLogs = [
        {
          id: '1',
          event_type: 'invoice_created',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          user_id: 'user-123',
          correlation_id: 'corr-123',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0...',
          metadata: { source: 'web' },
          old_values: {},
          new_values: { status: 'pending' },
          created_at: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          event_type: 'invoice_viewed',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          user_id: 'user-456',
          correlation_id: 'corr-456',
          metadata: { timestamp: '2024-01-01T10:05:00Z' },
          created_at: new Date('2024-01-01T10:05:00Z'),
        },
      ];

      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/invoice-123?limit=50');
      const response = await GET(request, { params: { id: 'invoice-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoice_id).toBe('invoice-123');
      expect(data.audit_logs).toHaveLength(2);
      expect(data.total_count).toBe(2);
      expect(data.audit_logs[0].event_type).toBe('invoice_created');
      expect(data.audit_logs[1].event_type).toBe('invoice_viewed');
      expect(auditLogger.getEntityLogs).toHaveBeenCalledWith('invoice', 'invoice-123', 50);
    });

    it('should use default limit when not specified', async () => {
      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/invoice-123');
      const response = await GET(request, { params: { id: 'invoice-123' } });

      expect(response.status).toBe(200);
      expect(auditLogger.getEntityLogs).toHaveBeenCalledWith('invoice', 'invoice-123', 100);
    });

    it('should handle empty audit logs', async () => {
      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/invoice-999');
      const response = await GET(request, { params: { id: 'invoice-999' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.audit_logs).toHaveLength(0);
      expect(data.total_count).toBe(0);
    });

    it('should return 400 when invoice ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/audit/invoices/');
      const response = await GET(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invoice ID is required');
    });

    it('should handle audit logger errors', async () => {
      (auditLogger.getEntityLogs as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/invoice-123');
      const response = await GET(request, { params: { id: 'invoice-123' } });

      expect(response.status).toBe(500);
    });

    it('should validate limit parameter', async () => {
      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/invoice-123?limit=invalid');
      const response = await GET(request, { params: { id: 'invoice-123' } });

      // Should handle invalid limit gracefully - either use default or return error
      expect([200, 400]).toContain(response.status);
    });

    it('should handle very large limit values', async () => {
      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/invoice-123?limit=999999');
      const response = await GET(request, { params: { id: 'invoice-123' } });

      expect(response.status).toBe(200);
      expect(auditLogger.getEntityLogs).toHaveBeenCalledWith('invoice', 'invoice-123', 999999);
    });
  });

  describe('GET /api/audit/transactions/[id]', () => {
    it('should return audit logs for a specific transaction', async () => {
      const mockTransactionLogs = [
        {
          id: '1',
          event_type: 'payment_attempted',
          entity_type: 'payment',
          entity_id: 'payment-123',
          user_id: 'user-123',
          metadata: {
            invoice_id: 'invoice-123',
            amount: 1000.00,
            payment_method: 'card',
          },
          created_at: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          event_type: 'payment_succeeded',
          entity_type: 'payment',
          entity_id: 'payment-123',
          user_id: 'user-123',
          metadata: {
            invoice_id: 'invoice-123',
            amount: 1000.00,
            stripe_session_id: 'cs_test_123',
          },
          created_at: new Date('2024-01-01T10:02:00Z'),
        },
      ];

      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue(mockTransactionLogs);

      const request = new NextRequest('http://localhost:3000/api/audit/transactions/payment-123');
      const response = await GetTransactionLogs(request, { params: { id: 'payment-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transaction_id).toBe('payment-123');
      expect(data.audit_logs).toHaveLength(2);
      expect(data.total_count).toBe(2);
      expect(data.audit_logs[0].event_type).toBe('payment_attempted');
      expect(data.audit_logs[1].event_type).toBe('payment_succeeded');
      expect(auditLogger.getEntityLogs).toHaveBeenCalledWith('payment', 'payment-123', 100);
    });

    it('should return empty logs for non-existent transaction', async () => {
      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/audit/transactions/payment-999');
      const response = await GetTransactionLogs(request, { params: { id: 'payment-999' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.audit_logs).toHaveLength(0);
      expect(data.total_count).toBe(0);
    });

    it('should return 400 when transaction ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/audit/transactions/');
      const response = await GetTransactionLogs(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Transaction ID is required');
    });

    it('should handle payment failure audit logs', async () => {
      const mockFailedPaymentLogs = [
        {
          id: '1',
          event_type: 'payment_attempted',
          entity_type: 'payment',
          entity_id: 'payment-456',
          user_id: 'user-456',
          metadata: {
            invoice_id: 'invoice-456',
            amount: 500.00,
          },
          created_at: new Date('2024-01-01T11:00:00Z'),
        },
        {
          id: '2',
          event_type: 'payment_failed',
          entity_type: 'payment',
          entity_id: 'payment-456',
          user_id: 'user-456',
          metadata: {
            invoice_id: 'invoice-456',
            failure_reason: 'Insufficient funds',
            stripe_error_code: 'card_declined',
          },
          created_at: new Date('2024-01-01T11:01:00Z'),
        },
      ];

      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue(mockFailedPaymentLogs);

      const request = new NextRequest('http://localhost:3000/api/audit/transactions/payment-456');
      const response = await GetTransactionLogs(request, { params: { id: 'payment-456' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.audit_logs).toHaveLength(2);
      expect(data.audit_logs[1].event_type).toBe('payment_failed');
      expect(data.audit_logs[1].metadata.failure_reason).toBe('Insufficient funds');
    });

    it('should handle database errors', async () => {
      (auditLogger.getEntityLogs as jest.Mock).mockRejectedValue(
        new Error('Audit database unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/audit/transactions/payment-123');
      const response = await GetTransactionLogs(request, { params: { id: 'payment-123' } });

      expect(response.status).toBe(500);
    });
  });

  describe('Audit Log Data Structure', () => {
    it('should preserve complete audit log structure', async () => {
      const mockCompleteLog = {
        id: 'audit-123',
        event_type: 'invoice_updated',
        entity_type: 'invoice',
        entity_id: 'invoice-123',
        user_id: 'user-123',
        correlation_id: 'corr-123',
        ip_address: '203.0.113.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        metadata: {
          source: 'admin_panel',
          update_reason: 'payment_method_changed',
          previous_status: 'pending',
        },
        old_values: {
          payment_method: null,
          status: 'pending',
        },
        new_values: {
          payment_method: 'stripe',
          status: 'paid',
        },
        created_at: new Date('2024-01-01T12:00:00Z'),
      };

      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue([mockCompleteLog]);

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/invoice-123');
      const response = await GET(request, { params: { id: 'invoice-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      const log = data.audit_logs[0];
      expect(log.event_type).toBe('invoice_updated');
      expect(log.entity_id).toBe('invoice-123');
      expect(log.correlation_id).toBe('corr-123');
      expect(log.metadata).toBeDefined();
      expect(log.old_values).toBeDefined();
      expect(log.new_values).toBeDefined();
      expect(log.created_at).toBeDefined();
    });

    it('should handle logs with minimal data', async () => {
      const mockMinimalLog = {
        id: 'audit-456',
        event_type: 'system_event',
        entity_type: 'system',
        metadata: {
          message: 'Database backup completed',
        },
        created_at: new Date('2024-01-01T13:00:00Z'),
      };

      (auditLogger.getEntityLogs as jest.Mock).mockResolvedValue([mockMinimalLog]);

      const request = new NextRequest('http://localhost:3000/api/audit/invoices/system-backup');
      const response = await GET(request, { params: { id: 'system-backup' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      const log = data.audit_logs[0];
      expect(log.event_type).toBe('system_event');
      expect(log.metadata.message).toBe('Database backup completed');
      expect(log.user_id).toBeUndefined();
      expect(log.entity_id).toBeUndefined();
    });
  });
});