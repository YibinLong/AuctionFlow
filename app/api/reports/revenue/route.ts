import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Decimal } from 'decimal.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly, monthly

    // Date filtering
    const dateFilter = startDate && endDate
      ? `AND DATE(p.created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    // Base query for revenue data
    const revenueQuery = `
      SELECT
        DATE(p.created_at) as date,
        COUNT(*) as transaction_count,
        SUM(p.amount) as gross_revenue,
        SUM(COALESCE(i.buyers_premium_amount, 0)) as premium_revenue,
        SUM(COALESCE(i.tax_amount, 0)) as tax_revenue,
        SUM(p.amount - COALESCE(i.buyers_premium_amount, 0) - COALESCE(i.tax_amount, 0)) as net_revenue,
        AVG(p.amount) as avg_transaction_value,
        MAX(p.amount) as max_transaction,
        MIN(p.amount) as min_transaction
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.status = 'completed'
      ${dateFilter}
      GROUP BY DATE(p.created_at)
      ORDER BY date DESC
      LIMIT 365
    `;

    const result = await query(revenueQuery);

    // Calculate totals and metrics
    const totals = result.reduce((acc, row) => ({
      totalRevenue: acc.totalRevenue.plus(new Decimal(row.gross_revenue || 0)),
      totalTransactions: acc.totalTransactions + parseInt(row.transaction_count || 0),
      totalPremium: acc.totalPremium.plus(new Decimal(row.premium_revenue || 0)),
      totalTax: acc.totalTax.plus(new Decimal(row.tax_revenue || 0)),
      totalNetRevenue: acc.totalNetRevenue.plus(new Decimal(row.net_revenue || 0)),
      avgTransactionValue: acc.avgTransactionValue + parseFloat(row.avg_transaction_value || 0)
    }), {
      totalRevenue: new Decimal(0),
      totalTransactions: 0,
      totalPremium: new Decimal(0),
      totalTax: new Decimal(0),
      totalNetRevenue: new Decimal(0),
      avgTransactionValue: 0
    });

    // Calculate averages
    const avgTransactionValue = totals.totalTransactions > 0
      ? totals.totalRevenue.div(totals.totalTransactions)
      : new Decimal(0);

    // Growth rates (compare with previous period)
    const growthData = await calculateGrowthRates(startDate, endDate);

    // Payment method breakdown
    const paymentMethods = await getPaymentMethodBreakdown(startDate, endDate);

    // Top performing items
    const topItems = await getTopPerformingItems(startDate, endDate);

    const response = {
      success: true,
      data: {
        summary: {
          totalRevenue: totals.totalRevenue.toNumber(),
          totalTransactions: totals.totalTransactions,
          avgTransactionValue: avgTransactionValue.toNumber(),
          totalPremiumRevenue: totals.totalPremium.toNumber(),
          totalTaxRevenue: totals.totalTax.toNumber(),
          totalNetRevenue: totals.totalNetRevenue.toNumber(),
          growthRate: growthData.overallGrowth,
          period: startDate && endDate ? `${startDate} to ${endDate}` : 'All time'
        },
        dailyData: result.map(row => ({
          date: row.date,
          revenue: parseFloat(row.gross_revenue || 0),
          transactions: parseInt(row.transaction_count || 0),
          avgValue: parseFloat(row.avg_transaction_value || 0),
          premiumRevenue: parseFloat(row.premium_revenue || 0),
          taxRevenue: parseFloat(row.tax_revenue || 0),
          netRevenue: parseFloat(row.net_revenue || 0)
        })),
        breakdowns: {
          paymentMethods,
          topItems
        },
        growthRates: growthData,
        metadata: {
          granularity,
          recordCount: result.length,
          generatedAt: new Date().toISOString()
        }
      }
    };

    // Cache for 5 minutes
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch revenue analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function calculateGrowthRates(startDate?: string | null, endDate?: string | null) {
  try {
    // Get current period data
    const currentFilter = startDate && endDate
      ? `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : `AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)`;

    // Get previous period data (same duration, before current period)
    let previousFilter = '';
    if (startDate && endDate) {
      const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const prevStart = new Date(new Date(startDate).getTime() - (daysDiff * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const prevEnd = new Date(new Date(startDate).getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      previousFilter = `AND DATE(created_at) BETWEEN '${prevStart}' AND '${prevEnd}'`;
    } else {
      previousFilter = `AND created_at < DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 60 DAY)`;
    }

    const currentPeriodQuery = `
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE status = 'completed' ${currentFilter}
    `;

    const previousPeriodQuery = `
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE status = 'completed' ${previousFilter}
    `;

    const [currentResult, previousResult] = await Promise.all([
      query(currentPeriodQuery),
      query(previousPeriodQuery)
    ]);

    const currentRevenue = new Decimal(currentResult[0]?.total || 0);
    const previousRevenue = new Decimal(previousResult[0]?.total || 0);
    const currentCount = parseInt(currentResult[0]?.count || 0);
    const previousCount = parseInt(previousResult[0]?.count || 0);

    const revenueGrowth = previousRevenue.gt(0)
      ? currentRevenue.minus(previousRevenue).div(previousRevenue).times(100)
      : new Decimal(0);

    const transactionGrowth = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : 0;

    return {
      overallGrowth: revenueGrowth.toNumber(),
      revenueGrowth: revenueGrowth.toNumber(),
      transactionGrowth,
      currentPeriod: {
        revenue: currentRevenue.toNumber(),
        transactions: currentCount
      },
      previousPeriod: {
        revenue: previousRevenue.toNumber(),
        transactions: previousCount
      }
    };
  } catch (error) {
    console.error('Growth rate calculation error:', error);
    return {
      overallGrowth: 0,
      revenueGrowth: 0,
      transactionGrowth: 0,
      currentPeriod: { revenue: 0, transactions: 0 },
      previousPeriod: { revenue: 0, transactions: 0 }
    };
  }
}

async function getPaymentMethodBreakdown(startDate?: string | null, endDate?: string | null) {
  try {
    const dateFilter = startDate && endDate
      ? `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const paymentMethodQuery = `
      SELECT
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as avg_amount
      FROM payments
      WHERE status = 'completed' ${dateFilter}
      GROUP BY payment_method
      ORDER BY total DESC
    `;

    const result = await query(paymentMethodQuery);

    return result.map(row => ({
      method: row.payment_method,
      count: parseInt(row.count || 0),
      total: parseFloat(row.total || 0),
      avgAmount: parseFloat(row.avg_amount || 0)
    }));
  } catch (error) {
    console.error('Payment method breakdown error:', error);
    return [];
  }
}

async function getTopPerformingItems(startDate?: string | null, endDate?: string | null) {
  try {
    const dateFilter = startDate && endDate
      ? `AND DATE(p.created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const topItemsQuery = `
      SELECT
        ai.title,
        ai.lot_number,
        COUNT(*) as sales_count,
        AVG(ii.quantity) as avg_quantity,
        SUM(ii.quantity * ii.unit_price) as total_sales,
        AVG(ii.unit_price) as avg_unit_price
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN invoice_items ii ON i.id = ii.invoice_id
      JOIN auction_items ai ON ii.auction_item_id = ai.id
      WHERE p.status = 'completed' ${dateFilter}
      GROUP BY ai.id, ai.title, ai.lot_number
      ORDER BY total_sales DESC
      LIMIT 10
    `;

    const result = await query(topItemsQuery);

    return result.map(row => ({
      title: row.title,
      lotNumber: row.lot_number,
      salesCount: parseInt(row.sales_count || 0),
      avgQuantity: parseFloat(row.avg_quantity || 0),
      totalSales: parseFloat(row.total_sales || 0),
      avgUnitPrice: parseFloat(row.avg_unit_price || 0)
    }));
  } catch (error) {
    console.error('Top performing items error:', error);
    return [];
  }
}