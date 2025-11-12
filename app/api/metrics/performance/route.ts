import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursBack = parseInt(searchParams.get('hours') || '24');
    const operation = searchParams.get('operation');

    if (operation) {
      // Get metrics for specific operation
      const operationMetrics = performanceMonitor.getOperationMetrics(operation, hoursBack);
      return NextResponse.json(operationMetrics);
    }

    // Get general performance analytics
    const analytics = performanceMonitor.getPerformanceAnalytics(hoursBack);

    // Generate some synthetic data if no real data exists
    if (analytics.totalRequests === 0) {
      performanceMonitor.generateSyntheticData(7); // Generate 7 days of synthetic data
      const newAnalytics = performanceMonitor.getPerformanceAnalytics(hoursBack);
      return NextResponse.json(newAnalytics);
    }

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}