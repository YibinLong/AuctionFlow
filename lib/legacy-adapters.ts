import { LegacyFoxProAuction, LegacySQLServerCustomer } from './types';

/**
 * FoxPro Legacy System Adapter
 * In production, this would connect to actual FoxPro database
 * For MVP, returns realistic mock data that can be easily replaced
 */
export class FoxProAdapter {
  private isConnected = false;

  async connect(): Promise<boolean> {
    // In production, establish actual FoxPro connection
    // For MVP, simulate connection
    console.log('Connecting to FoxPro legacy system...');

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.isConnected = true;
    console.log('FoxPro adapter connected (mock)');
    return true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('FoxPro adapter disconnected (mock)');
  }

  async getAuctionData(auctionDate?: Date): Promise<LegacyFoxProAuction[]> {
    if (!this.isConnected) {
      throw new Error('FoxPro adapter not connected');
    }

    console.log('Fetching auction data from FoxPro...');

    // Mock realistic auction data
    const mockData: LegacyFoxProAuction[] = [
      {
        lotNumber: 'FP001',
        title: '1975 Rolex Daytona Ref. 6263',
        description: 'Excellent condition with original box and papers',
        category: 'Watches',
        winningBid: 45000.00,
        buyerName: 'Michael Thompson',
        buyerEmail: 'm.thompson@email.com',
        auctionDate: auctionDate?.toISOString().split('T')[0] || '2024-01-15',
        condition: 'Excellent'
      },
      {
        lotNumber: 'FP002',
        title: 'Pablo Picasso Lithograph',
        description: 'Original lithograph from 1963, signed and numbered',
        category: 'Art',
        winningBid: 12500.00,
        buyerName: 'Sarah Chen',
        buyerEmail: 's.chen@email.com',
        auctionDate: auctionDate?.toISOString().split('T')[0] || '2024-01-15',
        condition: 'Very Good'
      },
      {
        lotNumber: 'FP003',
        title: 'Ming Dynasty Blue Vase',
        description: '14th century blue and white porcelain vase',
        category: 'Antiques',
        winningBid: 28000.00,
        buyerName: 'Robert Williams',
        buyerEmail: 'r.williams@email.com',
        auctionDate: auctionDate?.toISOString().split('T')[0] || '2024-01-15',
        condition: 'Good - some wear'
      },
      {
        lotNumber: 'FP004',
        title: '1952 Gibson Les Paul Goldtop',
        description: 'Original electric guitar with case',
        category: 'Musical Instruments',
        winningBid: 8500.00,
        buyerName: 'James Rodriguez',
        buyerEmail: 'j.rodriguez@email.com',
        auctionDate: auctionDate?.toISOString().split('T')[0] || '2024-01-15',
        condition: 'Good'
      },
      {
        lotNumber: 'FP005',
        title: 'Diamond Tennis Bracelet',
        description: '18k white gold with 50 diamonds, total 25ct',
        category: 'Jewelry',
        winningBid: 18000.00,
        buyerName: 'Emily Johnson',
        buyerEmail: 'e.johnson@email.com',
        auctionDate: auctionDate?.toISOString().split('T')[0] || '2024-01-15',
        condition: 'Excellent'
      }
    ];

    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return mockData;
  }

  async getCustomerData(customerEmail?: string): Promise<LegacySQLServerCustomer[]> {
    // In production, this would query FoxPro customer data
    // For MVP, return empty array - customer data comes from SQL Server
    console.log('FoxPro customer data not implemented (customer data in SQL Server)');
    return [];
  }
}

/**
 * SQL Server Legacy System Adapter
 * In production, this would connect to actual SQL Server database
 * For MVP, returns realistic mock data that can be easily replaced
 */
export class SQLServerAdapter {
  private isConnected = false;

  async connect(): Promise<boolean> {
    // In production, establish actual SQL Server connection
    // For MVP, simulate connection
    console.log('Connecting to SQL Server legacy system...');

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 150));

    this.isConnected = true;
    console.log('SQL Server adapter connected (mock)');
    return true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('SQL Server adapter disconnected (mock)');
  }

  async getCustomerData(customerEmail?: string): Promise<LegacySQLServerCustomer[]> {
    if (!this.isConnected) {
      throw new Error('SQL Server adapter not connected');
    }

    console.log('Fetching customer data from SQL Server...');

    // Mock realistic customer data
    const mockData: LegacySQLServerCustomer[] = [
      {
        customerId: 'CUST001',
        name: 'Michael Thompson',
        email: 'm.thompson@email.com',
        phone: '+1 (555) 123-4567',
        address: '123 Main St, Apt 4B',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        creditLimit: 100000.00,
        buyerPremiumRate: 0.10 // 10%
      },
      {
        customerId: 'CUST002',
        name: 'Sarah Chen',
        email: 's.chen@email.com',
        phone: '+1 (555) 987-6543',
        address: '456 Oak Avenue',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        creditLimit: 75000.00,
        buyerPremiumRate: 0.15 // 15% premium for high-value art
      },
      {
        customerId: 'CUST003',
        name: 'Robert Williams',
        email: 'r.williams@email.com',
        phone: '+1 (555) 246-8135',
        address: '789 Pine Street',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        creditLimit: 50000.00,
        buyerPremiumRate: 0.10 // 10%
      },
      {
        customerId: 'CUST004',
        name: 'James Rodriguez',
        email: 'j.rodriguez@email.com',
        phone: '+1 (555) 369-2580',
        address: '321 Elm Court',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
        creditLimit: 25000.00,
        buyerPremiumRate: 0.10 // 10%
      },
      {
        customerId: 'CUST005',
        name: 'Emily Johnson',
        email: 'e.johnson@email.com',
        phone: '+1 (555) 147-2580',
        address: '654 Maple Drive',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
        creditLimit: 150000.00,
        buyerPremiumRate: 0.20 // 20% premium for jewelry
      }
    ];

    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 250));

    // Filter by email if provided
    if (customerEmail) {
      return mockData.filter(customer =>
        customer.email.toLowerCase().includes(customerEmail.toLowerCase())
      );
    }

    return mockData;
  }

  async updateCustomerCreditLimit(customerId: string, newLimit: number): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('SQL Server adapter not connected');
    }

    console.log(`Updating credit limit for customer ${customerId} to $${newLimit}`);

    // Simulate database update delay
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Credit limit updated successfully (mock)');
    return true;
  }

  async getPurchaseHistory(customerId: string, months: number = 12): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('SQL Server adapter not connected');
    }

    console.log(`Fetching purchase history for customer ${customerId} (last ${months} months)`);

    // Mock purchase history data
    const mockHistory = [
      {
        purchaseId: 'PUR001',
        customerId,
        lotNumber: 'HP001',
        purchaseDate: '2023-12-01',
        amount: 5000.00,
        status: 'Paid'
      },
      {
        purchaseId: 'PUR002',
        customerId,
        lotNumber: 'HP002',
        purchaseDate: '2023-11-15',
        amount: 3200.00,
        status: 'Paid'
      }
    ];

    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return mockHistory;
  }
}

/**
 * Legacy System Manager
 * Coordinates all legacy system adapters
 */
export class LegacySystemManager {
  private foxProAdapter = new FoxProAdapter();
  private sqlServerAdapter = new SQLServerAdapter();

  async connect(): Promise<boolean> {
    try {
      await Promise.all([
        this.foxProAdapter.connect(),
        this.sqlServerAdapter.connect()
      ]);
      console.log('All legacy systems connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to legacy systems:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.foxProAdapter.disconnect(),
      this.sqlServerAdapter.disconnect()
    ]);
  }

  getFoxPro(): FoxProAdapter {
    return this.foxProAdapter;
  }

  getSQLServer(): SQLServerAdapter {
    return this.sqlServerAdapter;
  }

  async syncAuctionData(auctionDate?: Date): Promise<{
    foxProData: LegacyFoxProAuction[];
    customerData: LegacySQLServerCustomer[];
  }> {
    const [foxProData, customerData] = await Promise.all([
      this.foxProAdapter.getAuctionData(auctionDate),
      this.sqlServerAdapter.getCustomerData()
    ]);

    return { foxProData, customerData };
  }
}

// Export singleton instance
export const legacySystemManager = new LegacySystemManager();