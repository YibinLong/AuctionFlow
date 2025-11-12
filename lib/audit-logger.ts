import { query } from './db';
import { AuditLog } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEvent {
  event_type: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string;
  correlation_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  processing_time_ms?: number;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  private constructor() {
    // Set log level from environment
    const level = process.env.AUDIT_LOG_LEVEL?.toLowerCase();
    if (level && ['debug', 'info', 'warn', 'error'].includes(level)) {
      this.logLevel = level as any;
    }
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<AuditLog> {
    try {
      const auditLog: Omit<AuditLog, 'id' | 'created_at'> = {
        event_type: event.event_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        user_id: event.user_id,
        correlation_id: event.correlation_id || this.generateCorrelationId(),
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata || {},
        old_values: event.old_values || {},
        new_values: event.new_values || {}
      };

      // Include processing time in metadata if provided
      if (event.processing_time_ms) {
        auditLog.metadata.processing_time_ms = event.processing_time_ms;
      }

      // Insert into database
      const result = await query<AuditLog>(
        `INSERT INTO audit_logs (
          event_type, entity_type, entity_id, user_id, correlation_id,
          ip_address, user_agent, metadata, old_values, new_values
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          auditLog.event_type,
          auditLog.entity_type,
          auditLog.entity_id,
          auditLog.user_id,
          auditLog.correlation_id,
          auditLog.ip_address,
          auditLog.user_agent,
          JSON.stringify(auditLog.metadata),
          JSON.stringify(auditLog.old_values),
          JSON.stringify(auditLog.new_values)
        ]
      );

      const createdLog = result[0];

      // Also log to console for development
      if (this.shouldLog('debug')) {
        console.log('Audit Log:', {
          event_type: createdLog.event_type,
          entity_type: createdLog.entity_type,
          entity_id: createdLog.entity_id,
          user_id: createdLog.user_id,
          correlation_id: createdLog.correlation_id,
          created_at: createdLog.created_at
        });
      }

      return createdLog;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for an entity
   */
  async getEntityLogs(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const logs = await query<AuditLog>(
        `SELECT * FROM audit_logs
         WHERE entity_type = $1 AND entity_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [entityType, entityId, limit]
      );

      return logs;
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      const logs = await query<AuditLog>(
        `SELECT * FROM audit_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return logs;
    } catch (error) {
      console.error('Failed to fetch user audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs by correlation ID
   */
  async getLogsByCorrelationId(correlationId: string): Promise<AuditLog[]> {
    try {
      const logs = await query<AuditLog>(
        `SELECT * FROM audit_logs
         WHERE correlation_id = $1
         ORDER BY created_at ASC`,
        [correlationId]
      );

      return logs;
    } catch (error) {
      console.error('Failed to fetch correlation logs:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportLogs(
    startDate: Date,
    endDate: Date,
    entityType?: string,
    eventTypes?: string[]
  ): Promise<AuditLog[]> {
    try {
      let queryText = `
        SELECT * FROM audit_logs
        WHERE created_at >= $1 AND created_at <= $2
      `;
      const queryParams: any[] = [startDate, endDate];
      let paramIndex = 3;

      if (entityType) {
        queryText += ` AND entity_type = $${paramIndex}`;
        queryParams.push(entityType);
        paramIndex++;
      }

      if (eventTypes && eventTypes.length > 0) {
        queryText += ` AND event_type = ANY($${paramIndex})`;
        queryParams.push(eventTypes);
        paramIndex++;
      }

      queryText += ` ORDER BY created_at ASC`;

      const logs = await query<AuditLog>(queryText, queryParams);
      return logs;
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Convenience methods for common audit events
   */
  async logInvoiceViewed(invoiceId: string, userId?: string, metadata?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      event_type: 'invoice_viewed',
      entity_type: 'invoice',
      entity_id: invoiceId,
      user_id: userId,
      metadata
    });
  }

  async logInvoiceCreated(invoiceId: string, userId?: string, oldValues?: Record<string, any>, newValues?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      event_type: 'invoice_created',
      entity_type: 'invoice',
      entity_id: invoiceId,
      user_id: userId,
      old_values: oldValues,
      new_values: newValues
    });
  }

  async logInvoiceUpdated(invoiceId: string, userId?: string, oldValues?: Record<string, any>, newValues?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      event_type: 'invoice_updated',
      entity_type: 'invoice',
      entity_id: invoiceId,
      user_id: userId,
      old_values: oldValues,
      new_values: newValues
    });
  }

  async logPaymentAttempted(paymentId: string, invoiceId: string, userId?: string, metadata?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      event_type: 'payment_attempted',
      entity_type: 'payment',
      entity_id: paymentId,
      user_id: userId,
      metadata: { invoice_id: invoiceId, ...metadata }
    });
  }

  async logPaymentSucceeded(paymentId: string, invoiceId: string, userId?: string, metadata?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      event_type: 'payment_succeeded',
      entity_type: 'payment',
      entity_id: paymentId,
      user_id: userId,
      metadata: { invoice_id: invoiceId, ...metadata }
    });
  }

  async logPaymentFailed(paymentId: string, invoiceId: string, failureReason?: string, userId?: string): Promise<AuditLog> {
    return this.log({
      event_type: 'payment_failed',
      entity_type: 'payment',
      entity_id: paymentId,
      user_id: userId,
      metadata: {
        invoice_id: invoiceId,
        failure_reason: failureReason
      }
    });
  }

  async logCalculationPerformed(entityId: string, calculationType: string, inputs?: Record<string, any>, results?: Record<string, any>, userId?: string): Promise<AuditLog> {
    return this.log({
      event_type: 'calculation_performed',
      entity_type: 'calculation',
      entity_id: entityId,
      user_id: userId,
      metadata: {
        calculation_type: calculationType,
        inputs,
        results
      }
    });
  }

  async logUserAction(action: string, userId: string, metadata?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      event_type: 'user_action',
      entity_type: 'user',
      entity_id: userId,
      user_id: userId,
      metadata: { action, ...metadata }
    });
  }

  async logSystemEvent(eventType: string, metadata?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      event_type: eventType,
      entity_type: 'system',
      metadata
    });
  }

  /**
   * Generate a correlation ID for tracking related events
   */
  private generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Check if we should log at the given level
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const checkLevelIndex = levels.indexOf(level);
    return checkLevelIndex >= currentLevelIndex;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();