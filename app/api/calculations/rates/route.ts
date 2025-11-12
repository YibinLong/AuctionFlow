import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch current premium and tax rates from database or configuration
    // For now, return default rates that can be overridden by database

    let rates = {
      buyers_premium_rate: 0.10, // 10% default
      tax_rate: 0.085, // 8.5% default
      premium_tiers: [
        {
          id: 'default',
          name: 'Standard Rate',
          min_amount: 0,
          max_amount: null,
          rate: 0.10
        }
      ] as Array<{
        id: string;
        name: string;
        min_amount: number;
        max_amount: number | null;
        rate: number;
      }>,
      currency: 'USD'
    };

    try {
      // Try to fetch rates from database if table exists
      const dbRates = await query(`
        SELECT * FROM calculation_rates
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (dbRates.length > 0) {
        const rate = dbRates[0];
        rates = {
          buyers_premium_rate: parseFloat(rate.buyers_premium_rate),
          tax_rate: parseFloat(rate.tax_rate),
          premium_tiers: rates.premium_tiers, // Keep default tiers
          currency: rate.currency || 'USD'
        };
      }

      // Fetch premium tiers if they exist
      const tiers = await query(`
        SELECT * FROM premium_tiers
        WHERE is_active = true
        ORDER BY min_amount ASC
      `);

      if (tiers.length > 0) {
        rates.premium_tiers = tiers.map(tier => ({
          id: String(tier.id),
          name: String(tier.name),
          min_amount: parseFloat(tier.min_amount),
          max_amount: tier.max_amount ? parseFloat(tier.max_amount) : null as null,
          rate: parseFloat(tier.rate)
        }));
      }
    } catch (dbError) {
      console.warn('Could not fetch rates from database, using defaults:', dbError);
      // Continue with default rates
    }

    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching calculation rates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}