import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from './audit-logger';

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  processingTimeMs: number;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsInMemory = 10000; // Keep last 10k metrics in memory

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Middleware to track API performance
   */
  middleware() {
    return async (req: NextRequest, handler: () => Promise<NextResponse>) => {
      const startTime = Date.now();
      const endpoint = req.nextUrl.pathname;
      const method = req.method;

      // Extract user info from headers if available
      const userId = req.headers.get('x-user-id') || undefined;
      const userAgent = req.headers.get('user-agent') || undefined;
      const ipAddress = req.headers.get('x-forwarded-for') ||
                       req.headers.get('x-real-ip') ||
                       'unknown';

      try {
        const response = await handler();
        const endTime = Date.now();
        const processingTimeMs = endTime - startTime;

        // Record performance metrics
        const metric: PerformanceMetrics = {
          endpoint,
          method,
          statusCode: response.status,
          processingTimeMs,
          timestamp: new Date(),
          userAgent,
          ipAddress,
          userId
        };

        this.recordMetric(metric);

        // Log slow performance (>1 second) to audit trail
        if (processingTimeMs > 1000) {
          await auditLogger.log({
            event_type: 'slow_performance_detected',
            entity_type: 'api_endpoint',
            metadata: {
              endpoint,
              method,
              processing_time_ms: processingTimeMs,
              status_code: response.status
            },
            ip_address: ipAddress,
            user_agent: userAgent
          });
        }

        // Add performance header
        response.headers.set('x-processing-time-ms', processingTimeMs.toString());

        return response;
      } catch (error) {
        const endTime = Date.now();
        const processingTimeMs = endTime - startTime;

        // Log error performance
        await auditLogger.log({
          event_type: 'api_error',
          entity_type: 'api_endpoint',
          metadata: {
            endpoint,
            method,
            processing_time_ms: processingTimeMs,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          ip_address: ipAddress,
          user_agent: userAgent
        });

        throw error;
      }
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    // Add to in-memory metrics
    this.metrics.push(metric);

    // Trim if exceeding max size
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.maxMetricsInMemory);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance: ${metric.method} ${metric.endpoint} - ${metric.processingTimeMs}ms`);
    }
  }

  /**
   * Get performance analytics for dashboard
   */
  getPerformanceAnalytics(hoursBack: number = 24): {
    avgResponseTime: number;
    totalRequests: number;
    slowRequests: number;
    errorRate: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
  } {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        totalRequests: 0,
        slowRequests: 0,
        errorRate: 0,
        topEndpoints: []
      };
    }

    const totalRequests = recentMetrics.length;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / totalRequests;
    const slowRequests = recentMetrics.filter(m => m.processingTimeMs > 1000).length;
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    // Calculate top endpoints
    const endpointStats = new Map<string, { count: number; totalTime: number }>();

    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const stat = endpointStats.get(key) || { count: 0, totalTime: 0 };
      stat.count++;
      stat.totalTime += metric.processingTimeMs;
      endpointStats.set(key, stat);
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stat]) => ({
        endpoint,
        count: stat.count,
        avgTime: Math.round(stat.totalTime / stat.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      avgResponseTime: Math.round(avgResponseTime),
      totalRequests,
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      topEndpoints
    };
  }

  /**
   * Get processing time data for specific operations
   */
  getOperationMetrics(operation: string, hoursBack: number = 24): {
    avgTime: number;
    minTime: number;
    maxTime: number;
    count: number;
    slowOperations: number;
  } {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const operationMetrics = this.metrics.filter(m =>
      m.endpoint.includes(operation) && m.timestamp > cutoff
    );

    if (operationMetrics.length === 0) {
      return { avgTime: 0, minTime: 0, maxTime: 0, count: 0, slowOperations: 0 };
    }

    const times = operationMetrics.map(m => m.processingTimeMs);
    const count = times.length;
    const avgTime = times.reduce((sum, time) => sum + time, 0) / count;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const slowOperations = times.filter(time => time > 1000).length;

    return {
      avgTime: Math.round(avgTime),
      minTime,
      maxTime,
      count,
      slowOperations
    };
  }

  /**
   * Generate synthetic performance data for testing
   */
  generateSyntheticData(daysBack: number = 30): void {
    const endpoints = [
      '/api/invoices/',
      '/api/payments/',
      '/api/calculations/preview',
      '/api/reports/revenue',
      '/api/health'
    ];
    const methods = ['GET', 'POST', 'PUT'];

    for (let day = 0; day < daysBack; day++) {
      const date = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
      const requestsForDay = Math.floor(Math.random() * 500) + 100; // 100-600 requests per day

      for (let request = 0; request < requestsForDay; request++) {
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const timestamp = new Date(date);
        timestamp.setHours(hour, minute, Math.floor(Math.random() * 60));

        const metric: PerformanceMetrics = {
          endpoint: endpoints[Math.floor(Math.random() * endpoints.length)] + Math.random().toString(36).substring(7),
          method: methods[Math.floor(Math.random() * methods.length)],
          statusCode: Math.random() > 0.05 ? 200 : Math.random() > 0.5 ? 400 : 500,
          processingTimeMs: Math.floor(Math.random() * 800) + 50, // 50-850ms
          timestamp,
          userAgent: 'Mozilla/5.0 (synthetic)',
          ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`
        };

        this.recordMetric(metric);
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();