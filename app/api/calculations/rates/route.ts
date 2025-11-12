import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Get default rates from system settings
    const settingsResult = await query(
      `SELECT key, value FROM system_settings
       WHERE key IN ('default_buyers_premium_rate', 'default_tax_rate')`
    );

    const rates: Record<string, number> = {
      buyers_premium_rate: 0.10, // 10% default
      tax_rate: 0.085 // 8.5% default
    };

    // Override with database values if they exist
    settingsResult.forEach(setting => {
      if (setting.key === 'default_buyers_premium_rate') {
        rates.buyers_premium_rate = parseFloat(setting.value) || 0.10;
      } else if (setting.key === 'default_tax_rate') {
        rates.tax_rate = parseFloat(setting.value) || 0.085;
      }
    });

    // Category-specific rates (can be expanded later)
    const categoryRates: Record<string, { buyers_premium_rate: number; tax_rate: number }> = {
      'art': { buyers_premium_rate: 0.15, tax_rate: 0.085 }, // 15% premium for art
      'jewelry': { buyers_premium_rate: 0.20, tax_rate: 0.085 }, // 20% premium for jewelry
      'watches': { buyers_premium_rate: 0.15, tax_rate: 0.085 }, // 15% premium for watches
      'antiques': { buyers_premium_rate: 0.12, tax_rate: 0.085 }, // 12% premium for antiques
      'default': { buyers_premium_rate: rates.buyers_premium_rate, tax_rate: rates.tax_rate }
    };

    // If category is specified, return category-specific rates
    if (category) {
      const categoryRate = categoryRates[category.toLowerCase()] || categoryRates.default;
      return NextResponse.json({
        category: category.toLowerCase(),
        rates: categoryRate
      });
    }

    // Return all available rates
    return NextResponse.json({
      default_rates: rates,
      category_rates: categoryRates,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Error fetching calculation rates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}