import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Decimal } from 'decimal.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const auctionId = searchParams.get('auctionId');
    const consignorId = searchParams.get('consignorId');
    const status = searchParams.get('status'); // pending, settled, disputed
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build filters
    const filters = [];
    const params: any[] = [];

    if (startDate) {
      filters.push(`DATE(ar.created_at) >= $${params.length + 1}`);
      params.push(startDate);
    }
    if (endDate) {
      filters.push(`DATE(ar.created_at) <= $${params.length + 1}`);
      params.push(endDate);
    }
    if (auctionId) {
      filters.push(`ar.auction_id = $${params.length + 1}`);
      params.push(auctionId);
    }
    if (consignorId) {
      filters.push(`ai.seller_id = $${params.length + 1}`);
      params.push(consignorId);
    }
    if (status) {
      filters.push(`ar.settlement_status = $${params.length + 1}`);
      params.push(status);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Main settlements query
    const settlementsQuery = `
      SELECT
        ar.id as settlement_id,
        ar.auction_id,
        ar.auction_title,
        ar.settlement_status,
        ar.total_hammer_price,
        ar.total_buyers_premium,
        ar.commission_rate,
        ar.commission_amount,
        ar.net_proceeds,
        ar.settlement_date,
        ar.notes,
        ar.created_at,
        ar.updated_at,
        c.id as consignor_id,
        c.name as consignor_name,
        c.company_name,
        c.email as consignor_email,
        COUNT(ai.id) as item_count,
        SUM(ar.final_bid_amount) as total_hammer,
        AVG(ar.final_bid_amount) as avg_hammer_price,
        COUNT(CASE WHEN ar.settlement_status = 'settled' THEN 1 END) as settled_items
      FROM auction_results ar
      JOIN auction_items ai ON ar.item_id = ai.id
      LEFT JOIN users c ON ai.seller_id = c.id
      ${whereClause}
      GROUP BY ar.id, c.id, c.name, c.company_name, c.email
      ORDER BY ar.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const settlementsResult = await query(settlementsQuery, params);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT ar.id) as total
      FROM auction_results ar
      JOIN auction_items ai ON ar.item_id = ai.id
      LEFT JOIN users c ON ai.seller_id = c.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, params.slice(0, -2));
    const totalSettlements = parseInt(countResult[0]?.total || 0);

    // Settlements summary analytics
    const summaryQuery = `
      SELECT
        COUNT(*) as total_settlements,
        COUNT(CASE WHEN ar.settlement_status = 'settled' THEN 1 END) as settled_count,
        COUNT(CASE WHEN ar.settlement_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN ar.settlement_status = 'disputed' THEN 1 END) as disputed_count,
        SUM(ar.final_bid_amount) as total_hammer_price,
        SUM(ar.commission_amount) as total_commission,
        SUM(ar.net_proceeds) as total_net_proceeds,
        AVG(ar.commission_rate) as avg_commission_rate,
        AVG(ar.final_bid_amount) as avg_hammer_price,
        AVG(ar.net_proceeds) as avg_net_proceeds
      FROM auction_results ar
      JOIN auction_items ai ON ar.auction_item_id = ai.id
      ${whereClause}
    `;

    const summaryResult = await query(summaryQuery, params.slice(0, -2));

    // Status breakdown
    const statusBreakdownQuery = `
      SELECT
        ar.settlement_status,
        COUNT(*) as count,
        SUM(ar.final_bid_amount) as total_hammer,
        SUM(ar.commission_amount) as total_commission,
        SUM(ar.net_proceeds) as total_net_proceeds,
        AVG(ar.final_bid_amount) as avg_hammer
      FROM auction_results ar
      JOIN auction_items ai ON ar.auction_item_id = ai.id
      ${whereClause}
      GROUP BY ar.settlement_status
      ORDER BY count DESC
    `;

    const statusBreakdownResult = await query(statusBreakdownQuery, params.slice(0, -2));

    // Consignor breakdown (top consignors by net proceeds)
    const consignorBreakdownQuery = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.company_name,
        COUNT(DISTINCT ar.id) as settlement_count,
        COUNT(CASE WHEN ar.settlement_status = 'settled' THEN 1 END) as settled_count,
        SUM(ar.final_bid_amount) as total_hammer,
        SUM(ar.commission_amount) as total_commission,
        SUM(ar.net_proceeds) as total_net_proceeds,
        AVG(ar.commission_rate) as avg_commission_rate
      FROM auction_results ar
      JOIN auction_items ai ON ar.item_id = ai.id
      LEFT JOIN users c ON ai.seller_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY total_net_proceeds DESC
      LIMIT 20
    `;

    const consignorBreakdownResult = await query(consignorBreakdownQuery, params.slice(0, -2));

    // Commission rate distribution
    const commissionDistributionQuery = `
      SELECT
        CASE
          WHEN ar.commission_rate < 5 THEN 'Under 5%'
          WHEN ar.commission_rate < 10 THEN '5% - 9.99%'
          WHEN ar.commission_rate < 15 THEN '10% - 14.99%'
          WHEN ar.commission_rate < 20 THEN '15% - 19.99%'
          WHEN ar.commission_rate < 25 THEN '20% - 24.99%'
          ELSE '25% and above'
        END as commission_bracket,
        COUNT(*) as count,
        SUM(ar.final_bid_amount) as total_hammer,
        SUM(ar.net_proceeds) as total_net_proceeds
      FROM auction_results ar
      JOIN auction_items ai ON ar.auction_item_id = ai.id
      ${whereClause}
      GROUP BY commission_bracket
      ORDER BY MIN(ar.commission_rate)
    `;

    const commissionDistributionResult = await query(commissionDistributionQuery, params.slice(0, -2));

    // Process settlements data
    const settlements = settlementsResult.map(row => ({
      settlementId: row.settlement_id,
      auction: {
        id: row.auction_id,
        title: row.auction_title
      },
      consignor: {
        id: row.consignor_id,
        firstName: row.consignor_first_name,
        lastName: row.consignor_last_name,
        company: row.company_name,
        email: row.consignor_email
      },
      financials: {
        hammerPrice: parseFloat(row.total_hammer_price || 0),
        buyersPremium: parseFloat(row.total_buyers_premium || 0),
        commissionRate: parseFloat(row.commission_rate || 0),
        commissionAmount: parseFloat(row.commission_amount || 0),
        netProceeds: parseFloat(row.net_proceeds || 0),
        avgHammerPrice: parseFloat(row.avg_hammer_price || 0)
      },
      status: row.settlement_status,
      itemCount: parseInt(row.item_count || 0),
      settledItems: parseInt(row.settled_items || 0),
      settlementDate: row.settlement_date,
      notes: row.notes,
      dates: {
        created: row.created_at,
        updated: row.updated_at
      }
    }));

    const summary = summaryResult[0];

    const response = {
      success: true,
      data: {
        settlements,
        pagination: {
          page,
          limit,
          total: totalSettlements,
          totalPages: Math.ceil(totalSettlements / limit),
          hasNext: page * limit < totalSettlements,
          hasPrev: page > 1
        },
        summary: {
          totalSettlements: parseInt(summary.total_settlements || 0),
          settledCount: parseInt(summary.settled_count || 0),
          pendingCount: parseInt(summary.pending_count || 0),
          disputedCount: parseInt(summary.disputed_count || 0),
          settlementRate: summary.total_settlements > 0
            ? (parseInt(summary.settled_count || 0) / parseInt(summary.total_settlements)) * 100
            : 0,
          totalHammerPrice: parseFloat(summary.total_hammer_price || 0),
          totalCommission: parseFloat(summary.total_commission || 0),
          totalNetProceeds: parseFloat(summary.total_net_proceeds || 0),
          avgCommissionRate: parseFloat(summary.avg_commission_rate || 0),
          avgHammerPrice: parseFloat(summary.avg_hammer_price || 0),
          avgNetProceeds: parseFloat(summary.avg_net_proceeds || 0)
        },
        breakdowns: {
          status: statusBreakdownResult.map(row => ({
            status: row.settlement_status,
            count: parseInt(row.count || 0),
            totalHammer: parseFloat(row.total_hammer || 0),
            totalCommission: parseFloat(row.total_commission || 0),
            totalNetProceeds: parseFloat(row.total_net_proceeds || 0),
            avgHammer: parseFloat(row.avg_hammer || 0)
          })),
          consignors: consignorBreakdownResult.map(row => ({
            consignorId: row.id,
            name: `${row.first_name} ${row.last_name}`.trim() || row.company_name,
            company: row.company_name,
            settlementCount: parseInt(row.settlement_count || 0),
            settledCount: parseInt(row.settled_count || 0),
            totalHammer: parseFloat(row.total_hammer || 0),
            totalCommission: parseFloat(row.total_commission || 0),
            totalNetProceeds: parseFloat(row.total_net_proceeds || 0),
            avgCommissionRate: parseFloat(row.avg_commission_rate || 0)
          })),
          commissionRates: commissionDistributionResult.map(row => ({
            bracket: row.commission_bracket,
            count: parseInt(row.count || 0),
            totalHammer: parseFloat(row.total_hammer || 0),
            totalNetProceeds: parseFloat(row.total_net_proceeds || 0)
          }))
        },
        filters: {
          startDate,
          endDate,
          auctionId,
          consignorId,
          status
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          recordCount: settlements.length
        }
      }
    };

    // Cache for 5 minutes (settlement data changes less frequently)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('Settlements report error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch settlements report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}