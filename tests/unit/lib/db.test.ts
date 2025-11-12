import {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
} from '@/lib/db';
import { Pool, PoolClient } from 'pg';

// Mock pg
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  };

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  return {
    Pool: jest.fn(() => mockPool),
    PoolClient: jest.fn(),
  };
});

import { Pool as MockPool, PoolClient as MockPoolClient } from 'pg';

describe('Database Module Unit Tests', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new MockPool() as jest.Mocked<Pool>;
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    // Mock successful connection
    mockPool.query.mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('query()', () => {
    it('should execute a query successfully', async () => {
      const mockResult = {
        rows: [
          { id: 1, name: 'Test' },
          { id: 2, name: 'Test 2' },
        ],
        rowCount: 2,
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await query('SELECT * FROM test WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1]);
      expect(result).toEqual(mockResult.rows);
    });

    it('should log query duration in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockResult = { rows: [], rowCount: 0 };

      mockPool.query.mockImplementation(async () => {
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockResult;
      });

      await query('SELECT 1');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Executed query',
        expect.objectContaining({
          text: 'SELECT 1',
          duration: expect.any(Number),
          rows: 0,
        })
      );

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await query('SELECT 1');

      expect(consoleSpy).not.toHaveBeenCalledWith('Executed query', expect.any(Object));

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      mockPool.query.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(query('INVALID SQL')).rejects.toThrow('Query failed');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Database query error:',
        expect.objectContaining({
          text: 'INVALID SQL',
          error,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should work without parameters', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await query('SELECT NOW()');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT NOW()', undefined);
    });

    it('should work with empty parameters array', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await query('SELECT 1', []);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', []);
    });
  });

  describe('getClient()', () => {
    it('should get a client from the pool', async () => {
      const client = await getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);

      await expect(getClient()).rejects.toThrow('Connection failed');
    });
  });

  describe('transaction()', () => {
    it('should execute a successful transaction', async () => {
      const mockCallback = jest.fn().mockResolvedValue('success');

      const result = await transaction(mockCallback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockCallback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback on transaction failure', async () => {
      const error = new Error('Transaction failed');
      const mockCallback = jest.fn().mockRejectedValue(error);

      await expect(transaction(mockCallback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockCallback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback even if rollback fails', async () => {
      const error = new Error('Transaction failed');
      const rollbackError = new Error('Rollback failed');

      const mockCallback = jest.fn().mockRejectedValue(error);
      mockClient.query.mockRejectedValueOnce(rollbackError); // ROLLBACK fails

      await expect(transaction(mockCallback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if client release fails', async () => {
      const error = new Error('Client release failed');

      mockClient.query.mockResolvedValue({}); // All DB operations succeed
      mockClient.release.mockRejectedValue(error); // But release fails

      const mockCallback = jest.fn().mockResolvedValue('success');

      // Should not throw despite release failure
      await expect(transaction(mockCallback)).resolves.toBe('success');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('testConnection()', () => {
    it('should test successful connection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await testConnection();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(consoleSpy).toHaveBeenCalledWith('Database connection successful');
      expect(result).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should handle connection test failure', async () => {
      const error = new Error('Connection test failed');
      mockPool.query.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testConnection();

      expect(consoleSpy).toHaveBeenCalledWith('Database connection failed:', error);
      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle connection pool not being available', async () => {
      // Override the mock for this specific test
      const connectionError = new Error('Pool not available');
      mockPool.query.mockRejectedValue(connectionError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testConnection();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Database connection failed:', connectionError);

      consoleSpy.mockRestore();
    });
  });

  describe('closePool()', () => {
    it('should close the pool successfully', async () => {
      await closePool();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle pool close errors', async () => {
      const error = new Error('Failed to close pool');
      mockPool.end.mockRejectedValue(error);

      await expect(closePool()).rejects.toThrow('Failed to close pool');
    });
  });

  describe('Pool Configuration', () => {
    it('should configure pool with correct settings', () => {
      // The Pool constructor should have been called with correct configuration
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: expect.any(String),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        })
      );
    });

    it('should use DATABASE_URL from environment', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

      // Re-require the module to test initialization
      jest.resetModules();
      jest.mock('pg', () => {
        return {
          Pool: jest.fn(),
        };
      });

      const { Pool: MockPoolReimported } = require('pg');
      require('@/lib/db');

      expect(MockPoolReimported).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: 'postgresql://test:test@localhost:5432/testdb',
        })
      );

      delete process.env.DATABASE_URL;
    });
  });

  describe('Pool Error Handling', () => {
    it('should handle pool error events', () => {
      // The pool should have error event handler set up
      expect(mockPool.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });

    it('should exit process on pool error', () => {
      const processSpy = jest.spyOn(process, 'exit').mockImplementation();

      // Simulate the error callback being called
      const errorCallback = mockPool.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (errorCallback) {
        errorCallback(new Error('Pool error'));
        expect(processSpy).toHaveBeenCalledWith(-1);
      }

      processSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined parameters', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await query('SELECT $1', [null]);
      await query('SELECT $1', [undefined]);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(1, 'SELECT $1', [null]);
      expect(mockPool.query).toHaveBeenNthCalledWith(2, 'SELECT $1', [undefined]);
    });

    it('should handle empty result sets', async () => {
      const emptyResult = { rows: [], rowCount: 0 };
      mockPool.query.mockResolvedValue(emptyResult);

      const result = await query('SELECT * FROM empty_table');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle large result sets', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      mockPool.query.mockResolvedValue({
        rows: largeResultSet,
        rowCount: 1000,
      });

      const result = await query('SELECT * FROM large_table');

      expect(result).toHaveLength(1000);
      expect(result[0].id).toBe(0);
      expect(result[999].id).toBe(999);
    });

    it('should handle special characters in queries', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const queryWithSpecialChars = "SELECT * FROM test WHERE name = 'O\'Reilly'";
      await query(queryWithSpecialChars);

      expect(mockPool.query).toHaveBeenCalledWith(queryWithSpecialChars, undefined);
    });

    it('should handle transaction with async callback', async () => {
      let callbackResolved = false;

      const asyncCallback = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        callbackResolved = true;
        return 'async-result';
      });

      const result = await transaction(asyncCallback);

      expect(callbackResolved).toBe(true);
      expect(result).toBe('async-result');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});