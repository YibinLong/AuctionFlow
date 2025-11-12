import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Decimal } from 'decimal.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build filters
    const filters = [];
    const params: any[] = [];

    if (startDate) {
      filters.push(`DATE(p.created_at) >= $${params.length + 1}`);
      params.push(startDate);
    }
    if (endDate) {
      filters.push(`DATE(p.created_at) <= $${params.length + 1}`);
      params.push(endDate);
    }
    if (status) {
      filters.push(`p.status = $${params.length + 1}`);
      params.push(status);
    }
    if (paymentMethod) {
      filters.push(`p.payment_method = $${params.length + 1}`);
      params.push(paymentMethod);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Main query for transaction data
    const transactionsQuery = `
      SELECT
        p.id as payment_id,
        p.amount,
        p.status as payment_status,
        p.payment_method,
        p.stripe_payment_intent_id,
        p.created_at as payment_date,
        p.updated_at as last_updated,
        i.id as invoice_id,
        i.invoice_number,
        i.subtotal,
        i.buyers_premium_rate,
        i.buyers_premium_amount,
        i.tax_rate,
        i.tax_amount,
        i.grand_total,
        i.status as invoice_status,
        u.name,
        u.email,
        COUNT(ii.id) as item_count,
        SUM(ii.quantity * ii.unit_price) as items_total
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN users u ON i.buyer_id = u.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      ${whereClause}
      GROUP BY p.id, i.id, u.id, u.name, u.email
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const transactionsResult = await query(transactionsQuery, params);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN users u ON i.buyer_id = u.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, params.slice(0, -2));
    const totalTransactions = parseInt(countResult[0]?.total || 0);

    // Get analytics summary
    const analyticsQuery = `
      SELECT
        COUNT(*) as total_count,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as avg_amount,
        MAX(p.amount) as max_amount,
        MIN(p.amount) as min_amount,
        COUNT(CASE WHEN p.payment_method = 'card' THEN 1 END) as card_count,
        COUNT(CASE WHEN p.payment_method = 'bank_transfer' THEN 1 END) as bank_transfer_count,
        COUNT(CASE WHEN p.payment_method = 'check' THEN 1 END) as check_count
      FROM payments p
      ${whereClause}
    `;

    const analyticsResult = await query(analyticsQuery, params.slice(0, -2));

    // Get status breakdown
    const statusBreakdownQuery = `
      SELECT
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM payments p
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    const statusBreakdownResult = await query(statusBreakdownQuery, params.slice(0, -2));

    // Get payment method breakdown
    const methodBreakdownQuery = `
      SELECT
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM payments p
      ${whereClause}
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;

    const methodBreakdownResult = await query(methodBreakdownQuery, params.slice(0, -2));

    // Get hourly transaction distribution (last 7 days)
    const hourlyQuery = `
      SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments p
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        ${filters.filter(f => f.includes('status') || f.includes('payment_method')).join(' AND ')}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;

    const hourlyResult = await query(hourlyQuery);

    // Process transactions data
    const transactions = transactionsResult.map(row => ({
      paymentId: row.payment_id,
      invoiceId: row.invoice_id,
      invoiceNumber: row.invoice_number,
      buyer: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone
      },
      amounts: {
        subtotal: parseFloat(row.subtotal || 0),
        buyersPremium: parseFloat(row.buyers_premium_amount || 0),
        tax: parseFloat(row.tax_amount || 0),
        total: parseFloat(row.amount || 0),
        grandTotal: parseFloat(row.grand_total || 0)
      },
      rates: {
        buyersPremium: parseFloat(row.buyers_premium_rate || 0),
        tax: parseFloat(row.tax_rate || 0)
      },
      status: {
        payment: row.payment_status,
        invoice: row.invoice_status
      },
      payment: {
        method: row.payment_method,
        stripeIntentId: row.stripe_payment_intent_id
      },
      itemCount: parseInt(row.item_count || 0),
      itemsTotal: parseFloat(row.items_total || 0),
      dates: {
        payment: row.payment_date,
        lastUpdated: row.last_updated
      }
    }));

    const analytics = analyticsResult[0];

    const response = {
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total: totalTransactions,
          totalPages: Math.ceil(totalTransactions / limit),
          hasNext: page * limit < totalTransactions,
          hasPrev: page > 1
        },
        summary: {
          totalCount: parseInt(analytics.total_count || 0),
          completedCount: parseInt(analytics.completed_count || 0),
          pendingCount: parseInt(analytics.pending_count || 0),
          failedCount: parseInt(analytics.failed_count || 0),
          completionRate: analytics.total_count > 0
            ? (parseInt(analytics.completed_count || 0) / parseInt(analytics.total_count)) * 100
            : 0,
          totalAmount: parseFloat(analytics.total_amount || 0),
          avgAmount: parseFloat(analytics.avg_amount || 0),
          maxAmount: parseFloat(analytics.max_amount || 0),
          minAmount: parseFloat(analytics.min_amount || 0)
        },
        breakdowns: {
          status: statusBreakdownResult.map(row => ({
            status: row.status,
            count: parseInt(row.count || 0),
            totalAmount: parseFloat(row.total_amount || 0),
            avgAmount: parseFloat(row.avg_amount || 0)
          })),
          paymentMethods: methodBreakdownResult.map(row => ({
            method: row.payment_method,
            count: parseInt(row.count || 0),
            totalAmount: parseFloat(row.total_amount || 0),
            avgAmount: parseFloat(row.avg_amount || 0)
          }))
        },
        hourlyDistribution: hourlyResult.map(row => ({
          hour: parseInt(row.hour),
          count: parseInt(row.count || 0),
          totalAmount: parseFloat(row.total_amount || 0)
        })),
        filters: {
          startDate,
          endDate,
          status,
          paymentMethod
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          recordCount: transactions.length
        }
      }
    };

    // Cache for 2 minutes
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('Transaction analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transaction analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}