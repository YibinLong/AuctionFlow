import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch audit logs for the invoice
    const logs = await auditLogger.getEntityLogs('invoice', invoiceId, limit);

    return NextResponse.json({
      invoice_id: invoiceId,
      audit_logs: logs,
      total_count: logs.length
    });
  } catch (error) {
    console.error('Error fetching invoice audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}