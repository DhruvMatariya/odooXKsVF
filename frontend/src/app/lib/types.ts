export type UserRole = 'customer' | 'vendor' | 'admin';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  vendorProfile?: {
    id: string;
    user_id: string;
    gst_number: string;
    company_name: string;
    product_category: string;
    created_at: string;
    updated_at: string;
  };
}

export interface Category {
  id: string;
  name: string;
}

export interface PricingTier {
  id: string;
  period: 'HOUR' | 'DAY' | 'WEEK';
  duration: number;
  price: number;    // in paise
  deposit: number;  // in paise
}

export interface ProductImage {
  id: string;
  url: string;
}

export interface Inventory {
  available: number;
  reserved: number;
  rented: number;
  maintenance: number;
}

export interface LateFeeRule {
  gracePeriodHours: number;
  rateType: 'HOURLY' | 'DAILY';
  rateAmount: number;  // in paise
  maxCap: number;      // in paise
}

export interface CancellationPolicy {
  fullRefundHoursBefore: number;
  partialRefundHoursBefore: number;
  partialRefundPercent: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  manufacturer: string;
  thumbnail: string;
  images: ProductImage[];
  category: Category;
  categoryId: string;
  vendorName: string;
  vendor: { companyName: string };
  inventory: Inventory;
  pricing: PricingTier[];
  lateFeeRule: LateFeeRule;
  cancellationPolicy: CancellationPolicy;
  status: 'ACTIVE' | 'INACTIVE';
}

export type OrderStatus =
  | 'CONFIRMED'
  | 'DISPATCHED'
  | 'HANDED_OVER'
  | 'ACTIVE_RENTAL'
  | 'RETURN_SCHEDULED'
  | 'RETURNED_PENDING_INSPECTION'
  | 'COMPLETED'
  | 'DEPOSIT_REFUNDED'
  | 'DISPUTED'
  | 'PENALTY_APPLIED'
  | 'REJECTED_AT_DELIVERY'
  | 'CANCELLED'
  | 'REPLACEMENT_REQUESTED';

export interface OrderEvent {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorRole: 'CUSTOMER' | 'VENDOR' | 'SYSTEM';
  timestamp: string;
  note?: string;
}

export interface Deposit {
  amountHeld: number;       // in paise
  status: string;
  deductionAmount: number;  // in paise
  refundAmount: number;     // in paise
}

export interface Payment {
  amount: number;  // in paise
  status: string;
}

export interface Order {
  id: string;
  product: Product;
  pricing: PricingTier;
  deposit: Deposit;
  payment?: Payment;
  quantity: number;
  status: OrderStatus;
  rentalPeriodStart: string;
  rentalPeriodEnd: string;
  channel: 'ONLINE' | 'OFFLINE';
  orderEvents: OrderEvent[];
  customerEmail?: string;
}

export interface ReturnSlot {
  id: string;
  date: string;
  slotLabel: 'MORNING' | 'AFTERNOON' | 'EVENING';
  capacity: number;
  bookedCount: number;
}

export interface DashboardStats {
  activeRentals: number;
  dueToday: number;
  overdue: number;
  upcomingPickups: number;
  upcomingReturns: number;
  revenue: number;        // in paise
  depositsHeld: number;   // in paise
  lateFeesCollected: number; // in paise
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
  error?: { code: string; message: string };
}
