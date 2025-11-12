import { format, subDays, subYears, parseISO } from 'date-fns';

export interface LegacyDataImport {
  source: 'foxpro' | 'sqlserver';
  recordsProcessed: number;
  recordsImported: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
}

export interface LegacyAuctionItem {
  legacyId: string;
  title: string;
  description?: string;
  category?: string;
  estimatedValue?: number;
  reservePrice?: number;
  condition?: string;
  images?: string[];
  metadata?: Record<string, any>;
}

export interface LegacyBidder {
  legacyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  joinDate?: Date;
  metadata?: Record<string, any>;
}

export interface LegacyAuctionResult {
  legacyId: string;
  itemLegacyId: string;
  bidderLegacyId: string;
  auctionDate: Date;
  hammerPrice: number;
  buyersPremium?: number;
  tax?: number;
  totalAmount?: number;
  paymentStatus?: 'paid' | 'pending' | 'unpaid';
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

export class LegacyDataIntegrator {
  // FoxPro Integration
  static async importFromFoxPro(startDate?: Date, endDate?: Date): Promise<LegacyDataImport> {
    const startTime = new Date();
    const result: LegacyDataImport = {
      source: 'foxpro',
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      startTime,
      endTime: new Date()
    };

    try {
      console.log('Starting FoxPro data import...');

      // Mock implementation - in real scenario, this would connect to FoxPro database
      const mockFoxProData = await this.generateMockFoxProData(startDate, endDate);
      result.recordsProcessed = mockFoxProData.length;

      // Process and import auction items
      for (const record of mockFoxProData) {
        try {
          await this.importLegacyAuctionItem(record, 'foxpro');
          result.recordsImported++;
        } catch (error) {
          result.errors.push(`Failed to import item ${record.legacyId}: ${error}`);
        }
      }

      result.endTime = new Date();
      console.log(`FoxPro import completed: ${result.recordsImported}/${result.recordsProcessed} records`);

    } catch (error) {
      result.errors.push(`FoxPro import failed: ${error}`);
    }

    return result;
  }

  // SQL Server Integration
  static async importFromSQLServer(startDate?: Date, endDate?: Date): Promise<LegacyDataImport> {
    const startTime = new Date();
    const result: LegacyDataImport = {
      source: 'sqlserver',
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      startTime,
      endTime: new Date()
    };

    try {
      console.log('Starting SQL Server data import...');

      // Mock implementation - in real scenario, this would connect to SQL Server
      const mockSQLServerData = await this.generateMockSQLServerData(startDate, endDate);
      result.recordsProcessed = mockSQLServerData.length;

      // Process and import auction results
      for (const record of mockSQLServerData) {
        try {
          await this.importLegacyAuctionResult(record, 'sqlserver');
          result.recordsImported++;
        } catch (error) {
          result.errors.push(`Failed to import result ${record.legacyId}: ${error}`);
        }
      }

      result.endTime = new Date();
      console.log(`SQL Server import completed: ${result.recordsImported}/${result.recordsProcessed} records`);

    } catch (error) {
      result.errors.push(`SQL Server import failed: ${error}`);
    }

    return result;
  }

  // Import legacy auction item
  private static async importLegacyAuctionItem(item: LegacyAuctionItem, source: string): Promise<void> {
    // For client-side usage, this would be handled by API endpoints
    // Mock implementation for client side
    console.log(`Importing legacy auction item ${item.legacyId} from ${source}`);
  }

  // Import legacy auction result
  private static async importLegacyAuctionResult(result: LegacyAuctionResult, source: string): Promise<void> {
    // For client-side usage, this would be handled by API endpoints
    // Mock implementation for client side
    console.log(`Importing legacy auction result ${result.legacyId} from ${source}`);
  }

  // Mock data generators for testing
  private static async generateMockFoxProData(startDate?: Date, endDate?: Date): Promise<LegacyAuctionItem[]> {
    const items: LegacyAuctionItem[] = [];
    const start = startDate || subYears(new Date(), 2);
    const end = endDate || new Date();
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(daysDiff * 2, 1000); i++) {
      items.push({
        legacyId: `FP-${100000 + i}`,
        title: [
          'Vintage Rolex Submariner',
          'Antique Victorian Furniture',
          'Modern Art Painting',
          'Classic Car Parts',
          'Fine China Collection',
          'Rare Coins Set',
          'Vintage Jewelry',
          'Historical Documents',
          'Fine Wine Collection',
          'Antique Clock'
        ][Math.floor(Math.random() * 10)],
        description: `Imported from FoxPro system - ${format(subDays(new Date(), Math.random() * 365), 'yyyy-MM-dd')}`,
        category: ['Watches', 'Furniture', 'Art', 'Automotive', 'Collectibles'][Math.floor(Math.random() * 5)],
        estimatedValue: Math.random() * 10000 + 500,
        reservePrice: Math.random() * 8000 + 200,
        condition: ['Excellent', 'Good', 'Fair', 'Poor'][Math.floor(Math.random() * 4)],
        metadata: {
          importDate: new Date().toISOString(),
          sourceSystem: 'FoxPro v9.0',
          originalCategory: `Category ${Math.floor(Math.random() * 100)}`
        }
      });
    }

    return items;
  }

  private static async generateMockSQLServerData(startDate?: Date, endDate?: Date): Promise<LegacyAuctionResult[]> {
    const results: LegacyAuctionResult[] = [];
    const start = startDate || subYears(new Date(), 2);
    const end = endDate || new Date();
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(daysDiff * 3, 2000); i++) {
      const hammerPrice = Math.random() * 15000 + 100;
      const buyersPremium = hammerPrice * (0.10 + Math.random() * 0.10); // 10-20%
      const tax = (hammerPrice + buyersPremium) * 0.08; // 8% tax
      const totalAmount = hammerPrice + buyersPremium + tax;

      results.push({
        legacyId: `SQL-${200000 + i}`,
        itemLegacyId: `FP-${100000 + Math.floor(Math.random() * 1000)}`,
        bidderLegacyId: `CUST-${300000 + Math.floor(Math.random() * 500)}`,
        auctionDate: subDays(new Date(), Math.random() * 365),
        hammerPrice,
        buyersPremium,
        tax,
        totalAmount,
        paymentStatus: ['paid', 'pending', 'unpaid'][Math.floor(Math.random() * 3)] as any,
        paymentMethod: ['cash', 'check', 'card', 'bank_transfer'][Math.floor(Math.random() * 4)],
        metadata: {
          importDate: new Date().toISOString(),
          sourceSystem: 'SQL Server 2019',
          auctionHouse: 'Legacy Auction House',
          auctionNumber: Math.floor(Math.random() * 1000)
        }
      });
    }

    return results;
  }

  // Sync status and statistics
  static async getSyncStatistics() {
    try {
      // For client-side usage, fetch from API endpoint
      const response = await fetch('/api/legacy/sync-stats');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get sync statistics from API:', error);
    }

    // Fallback mock data for client side
    return {
      totalLegacyItems: 1247,
      totalLegacyResults: 892,
      itemsBySource: {
        foxpro: 847,
        sqlserver: 400
      },
      resultsBySource: {
        foxpro: 342,
        sqlserver: 550
      }
    };
  }

  // Validate legacy data integrity
  static async validateLegacyData() {
    try {
      // For client-side usage, fetch from API endpoint
      const response = await fetch('/api/legacy/validate-data');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to validate legacy data from API:', error);
    }

    // Fallback mock data for client side
    return {
      orphanedResults: 12,
      missingMetadata: 34,
      invalidAmounts: 3,
      duplicates: 8
    };
  }
}

// Integration status monitoring
export class LegacyIntegrationMonitor {
  static async getIntegrationHealth() {
    const stats = await LegacyDataIntegrator.getSyncStatistics();
    const validation = await LegacyDataIntegrator.validateLegacyData();

    const healthScore = 100 - (
      (validation.orphanedResults * 10) +
      (validation.missingMetadata * 5) +
      (validation.invalidAmounts * 20) +
      (validation.duplicates * 15)
    );

    return {
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'error',
      score: Math.max(0, healthScore),
      stats,
      validation,
      recommendations: this.generateRecommendations(validation)
    };
  }

  private static generateRecommendations(validation: any) {
    const recommendations = [];

    if (validation.orphanedResults > 0) {
      recommendations.push({
        type: 'error',
        message: `${validation.orphanedResults} orphaned auction results found. Run cleanup script.`
      });
    }

    if (validation.missingMetadata > 0) {
      recommendations.push({
        type: 'warning',
        message: `${validation.missingMetadata} items have missing metadata. Consider enrichment.`
      });
    }

    if (validation.invalidAmounts > 0) {
      recommendations.push({
        type: 'error',
        message: `${validation.invalidAmounts} records have invalid amounts. Review data quality.`
      });
    }

    if (validation.duplicates > 0) {
      recommendations.push({
        type: 'warning',
        message: `${validation.duplicates} duplicate records detected. Run deduplication.`
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'Legacy data integration is functioning properly.'
      });
    }

    return recommendations;
  }
}