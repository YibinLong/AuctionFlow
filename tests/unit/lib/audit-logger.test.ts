import { AuditLogger, auditLogger } from '@/lib/audit-logger';
import { query } from '@/lib/db';
import { AuditLog } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-correlation-id'),
}));

import { v4 as uuidv4 } from 'uuid';

describe('Audit Logger Unit Tests', () => {
  let mockLogger: AuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = AuditLogger.getInstance();

    // Reset environment variables
    delete process.env.AUDIT_LOG_LEVEL;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const logger1 = AuditLogger.getInstance();
      const logger2 = AuditLogger.getInstance();
      expect(logger1).toBe(logger2);
    });

    it('should initialize with default log level', () => {
      const logger = AuditLogger.getInstance();
      expect(logger).toBeDefined();
    });

    it('should set log level from environment', () => {
      process.env.AUDIT_LOG_LEVEL = 'debug';
      const logger = AuditLogger.getInstance();
      expect(logger).toBeDefined();
    });
  });

  describe('log()', () => {
    const mockAuditEvent = {
      event_type: 'test_event',
      entity_type: 'test_entity',
      entity_id: 'test-123',
      user_id: 'user-123',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      metadata: { key: 'value' },
      old_values: { old: 'value' },
      new_values: { new: 'value' },
    };

    it('should log an audit event successfully', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-123',
        event_type: mockAuditEvent.event_type,
        entity_type: mockAuditEvent.entity_type,
        entity_id: mockAuditEvent.entity_id,
        user_id: mockAuditEvent.user_id,
        correlation_id: 'mock-correlation-id',
        ip_address: mockAuditEvent.ip_address,
        user_agent: mockAuditEvent.user_agent,
        metadata: mockAuditEvent.metadata,
        old_values: mockAuditEvent.old_values,
        new_values: mockAuditEvent.new_values,
        created_at: new Date(),
      };

      (query as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await mockLogger.log(mockAuditEvent);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          mockAuditEvent.event_type,
          mockAuditEvent.entity_type,
          mockAuditEvent.entity_id,
          mockAuditEvent.user_id,
          'mock-correlation-id',
          mockAuditEvent.ip_address,
          mockAuditEvent.user_agent,
          JSON.stringify(mockAuditEvent.metadata),
          JSON.stringify(mockAuditEvent.old_values),
          JSON.stringify(mockAuditEvent.new_values),
        ]
      );
      expect(result).toEqual(mockAuditLog);
    });

    it('should generate correlation ID when not provided', async () => {
      const eventWithoutCorrelationId = {
        ...mockAuditEvent,
        correlation_id: undefined,
      };

      const mockAuditLog: AuditLog = {
        ...eventWithoutCorrelationId,
        id: 'audit-123',
        correlation_id: 'generated-correlation-id',
        created_at: new Date(),
      };

      (uuidv4 as jest.Mock).mockReturnValue('generated-correlation-id');
      (query as jest.Mock).mockResolvedValue([mockAuditLog]);

      await mockLogger.log(eventWithoutCorrelationId);

      expect(uuidv4).toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['generated-correlation-id'])
      );
    });

    it('should handle database errors', async () => {
      (query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(mockLogger.log(mockAuditEvent)).rejects.toThrow('Database error');
    });

    it('should handle missing optional fields', async () => {
      const minimalEvent = {
        event_type: 'minimal_event',
        entity_type: 'minimal_entity',
      };

      const mockAuditLog: AuditLog = {
        id: 'audit-123',
        event_type: minimalEvent.event_type,
        entity_type: minimalEvent.entity_type,
        entity_id: null,
        user_id: null,
        correlation_id: 'mock-correlation-id',
        ip_address: null,
        user_agent: null,
        metadata: {},
        old_values: {},
        new_values: {},
        created_at: new Date(),
      };

      (query as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await mockLogger.log(minimalEvent);

      expect(result).toBeDefined();
      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          minimalEvent.event_type,
          minimalEvent.entity_type,
          undefined, // entity_id can be undefined
          undefined, // user_id can be undefined
          expect.any(String), // correlation_id
          undefined, // ip_address can be undefined
          undefined, // user_agent can be undefined
          '{}',
          '{}',
          '{}',
        ])
      );
    });
  });

  describe('getEntityLogs()', () => {
    it('should fetch logs for a specific entity', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          event_type: 'invoice_created',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          created_at: new Date(),
        },
        {
          id: '2',
          event_type: 'invoice_updated',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          created_at: new Date(),
        },
      ] as AuditLog[];

      (query as jest.Mock).mockResolvedValue(mockLogs);

      const result = await mockLogger.getEntityLogs('invoice', 'invoice-123', 50);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM audit_logs'),
        ['invoice', 'invoice-123', 50]
      );
      expect(result).toEqual(mockLogs);
    });

    it('should use default limit', async () => {
      (query as jest.Mock).mockResolvedValue([]);

      await mockLogger.getEntityLogs('payment', 'payment-123');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['payment', 'payment-123', 100]
      );
    });

    it('should handle database errors', async () => {
      (query as jest.Mock).mockRejectedValue(new Error('Query failed'));

      await expect(
        mockLogger.getEntityLogs('invoice', 'invoice-123')
      ).rejects.toThrow('Query failed');
    });
  });

  describe('getUserLogs()', () => {
    it('should fetch logs for a specific user', async () => {
      const mockUserLogs: AuditLog[] = [
        {
          id: '1',
          event_type: 'user_action',
          entity_type: 'user',
          entity_id: 'user-123',
          user_id: 'user-123',
          created_at: new Date(),
        },
      ] as AuditLog[];

      (query as jest.Mock).mockResolvedValue(mockUserLogs);

      const result = await mockLogger.getUserLogs('user-123', 25);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123', 25]
      );
      expect(result).toEqual(mockUserLogs);
    });
  });

  describe('getLogsByCorrelationId()', () => {
    it('should fetch logs by correlation ID', async () => {
      const mockCorrelatedLogs: AuditLog[] = [
        {
          id: '1',
          event_type: 'payment_attempted',
          correlation_id: 'corr-123',
          created_at: new Date(),
        },
        {
          id: '2',
          event_type: 'payment_succeeded',
          correlation_id: 'corr-123',
          created_at: new Date(),
        },
      ] as AuditLog[];

      (query as jest.Mock).mockResolvedValue(mockCorrelatedLogs);

      const result = await mockLogger.getLogsByCorrelationId('corr-123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE correlation_id = $1'),
        ['corr-123']
      );
      expect(result).toEqual(mockCorrelatedLogs);
    });
  });

  describe('exportLogs()', () => {
    it('should export logs with date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockExportLogs: AuditLog[] = [
        {
          id: '1',
          event_type: 'invoice_created',
          created_at: new Date('2024-01-15'),
        },
      ] as AuditLog[];

      (query as jest.Mock).mockResolvedValue(mockExportLogs);

      const result = await mockLogger.exportLogs(startDate, endDate);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_at >= $1 AND created_at <= $2'),
        [startDate, endDate]
      );
      expect(result).toEqual(mockExportLogs);
    });

    it('should filter by entity type', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (query as jest.Mock).mockResolvedValue([]);

      await mockLogger.exportLogs(startDate, endDate, 'invoice');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND entity_type = $3'),
        [startDate, endDate, 'invoice']
      );
    });

    it('should filter by event types', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const eventTypes = ['invoice_created', 'invoice_updated'];

      (query as jest.Mock).mockResolvedValue([]);

      await mockLogger.exportLogs(startDate, endDate, undefined, eventTypes);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND event_type = ANY($3)'),
        [startDate, endDate, eventTypes]
      );
    });

    it('should handle all filters together', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const eventTypes = ['payment_attempted', 'payment_succeeded'];

      (query as jest.Mock).mockResolvedValue([]);

      await mockLogger.exportLogs(startDate, endDate, 'payment', eventTypes);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_at >= $1 AND created_at <= $2'),
        expect.arrayContaining([startDate, endDate])
      );
    });
  });

  describe('Convenience Methods', () => {
    it('should log invoice viewed', async () => {
      (query as jest.Mock).mockResolvedValue([{}]);

      await mockLogger.logInvoiceViewed('invoice-123', 'user-123', { source: 'email' });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'invoice_viewed',
          'invoice',
          'invoice-123',
          'user-123',
          expect.any(String),
          undefined,
          undefined,
          JSON.stringify({ source: 'email' }),
          '{}',
          '{}',
        ])
      );
    });

    it('should log invoice created', async () => {
      (query as jest.Mock).mockResolvedValue([{}]);

      await mockLogger.logInvoiceCreated('invoice-123', 'user-123', {}, { total: 1000 });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'invoice_created',
          'invoice',
          'invoice-123',
          'user-123',
          expect.any(String),
          undefined,
          undefined,
          '{}',
          '{}',
          JSON.stringify({ total: 1000 }),
        ])
      );
    });

    it('should log payment succeeded', async () => {
      (query as jest.Mock).mockResolvedValue([{}]);

      await mockLogger.logPaymentSucceeded('payment-123', 'invoice-123', 'user-123', { amount: 1000 });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'payment_succeeded',
          'payment',
          'payment-123',
          'user-123',
          expect.any(String),
          undefined,
          undefined,
          JSON.stringify({ invoice_id: 'invoice-123', amount: 1000 }),
          '{}',
          '{}',
        ])
      );
    });

    it('should log payment failed', async () => {
      (query as jest.Mock).mockResolvedValue([{}]);

      await mockLogger.logPaymentFailed('payment-123', 'invoice-123', 'Insufficient funds', 'user-123');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'payment_failed',
          'payment',
          'payment-123',
          'user-123',
          expect.any(String),
          undefined,
          undefined,
          JSON.stringify({
            invoice_id: 'invoice-123',
            failure_reason: 'Insufficient funds',
          }),
          '{}',
          '{}',
        ])
      );
    });

    it('should log calculation performed', async () => {
      (query as jest.Mock).mockResolvedValue([{}]);

      await mockLogger.logCalculationPerformed(
        'calc-123',
        'invoice_calculation',
        { items: [] },
        { total: 1000 },
        'user-123'
      );

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'calculation_performed',
          'calculation',
          'calc-123',
          'user-123',
          expect.any(String),
          undefined,
          undefined,
          JSON.stringify({
            calculation_type: 'invoice_calculation',
            inputs: { items: [] },
            results: { total: 1000 },
          }),
          '{}',
          '{}',
        ])
      );
    });

    it('should log user action', async () => {
      (query as jest.Mock).mockResolvedValue([{}]);

      await mockLogger.logUserAction('login', 'user-123', { method: 'oauth' });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'user_action',
          'user',
          'user-123',
          'user-123',
          expect.any(String),
          undefined,
          undefined,
          JSON.stringify({ action: 'login', method: 'oauth' }),
          '{}',
          '{}',
        ])
      );
    });

    it('should log system event', async () => {
      (query as jest.Mock).mockResolvedValue([{}]);

      await mockLogger.logSystemEvent('backup_completed', { duration: 3600 });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'backup_completed',
          'system',
          undefined,
          undefined,
          expect.any(String),
          undefined,
          undefined,
          JSON.stringify({ duration: 3600 }),
          '{}',
          '{}',
        ])
      );
    });
  });

  describe('Private Methods', () => {
    it('should generate correlation ID', () => {
      const logger = new AuditLogger();
      // @ts-ignore - accessing private method for testing
      const correlationId = logger.generateCorrelationId();

      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
    });

    it('should check log levels correctly', () => {
      const logger = new AuditLogger();
      // @ts-ignore - accessing private method for testing
      expect(logger.shouldLog('error')).toBe(true);
      expect(logger.shouldLog('warn')).toBe(true);
      expect(logger.shouldLog('info')).toBe(true);
      expect(logger.shouldLog('debug')).toBe(false); // default is info
    });
  });

  describe('Exported Singleton', () => {
    it('should export a singleton instance', () => {
      expect(auditLogger).toBeDefined();
      expect(auditLogger).toBeInstanceOf(AuditLogger);
    });

    it('should be the same instance as getInstance()', () => {
      expect(auditLogger).toBe(AuditLogger.getInstance());
    });
  });
});