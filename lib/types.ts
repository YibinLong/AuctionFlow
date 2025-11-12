export interface User {
  id: string;
  email: string;
  name: string;
  role: 'buyer' | 'admin' | 'staff';
  created_at: Date;
  updated_at: Date;
}

export interface AuctionItem {
  id: string;
  lot_id: string;
  title: string;
  description?: string;
  category?: string;
  condition_note?: string;
  auction_date: Date;
  seller_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuctionResult {
  id: string;
  item_id: string;
  buyer_id: string;
  winning_bid: number;
  buyer_premium_rate: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  auction_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  buyer_id: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  subtotal: number;
  buyers_premium_rate: number;
  buyers_premium_amount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  currency: string;
  due_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id?: string;
  lot_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
}

export interface Payment {
  id: string;
  invoice_id: string;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  payment_method?: string;
  failure_reason?: string;
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string;
  correlation_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  value?: string;
  description?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

// Extended types for API responses
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  buyer?: User;
}

export interface AuctionResultWithItem extends AuctionResult {
  item: AuctionItem;
  buyer?: User;
}

// Input types for API endpoints
export interface CreateInvoiceRequest {
  buyer_id: string;
  auction_result_ids: string[];
  custom_rates?: {
    buyers_premium_rate?: number;
    tax_rate?: number;
  };
}

export interface UpdateInvoiceRequest {
  status?: Invoice['status'];
  buyers_premium_rate?: number;
  tax_rate?: number;
}

export interface CreatePaymentRequest {
  invoice_id: string;
  success_url: string;
  cancel_url: string;
}

// Legacy system types (for mock adapters)
export interface LegacyFoxProAuction {
  lotNumber: string;
  title: string;
  description: string;
  category: string;
  winningBid: number;
  buyerName: string;
  buyerEmail: string;
  auctionDate: string;
  condition: string;
}

export interface LegacySQLServerCustomer {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  creditLimit: number;
  buyerPremiumRate: number;
}

export interface PremiumTier {
  min_amount: number;
  max_amount?: number;
  rate: number;
  description: string;
}