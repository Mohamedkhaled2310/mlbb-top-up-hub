export type PackageCategory = "diamonds" | "weekly_pass" | "double_diamonds" | "bundles" | string;

export interface TopUpPackage {
  id: string;
  offerId: string; // fazer offer/product id (fazer_packages.offer_id)
  gameId?: "mlbb" | "pubg" | "freefire" | "hok" | string;
  name: string;
  category: PackageCategory;
  diamonds: number;
  bonusDiamonds?: number;
  currencyName?: string;
  costUsd: number; // from Fazer
  retailPriceEgp: number; // computed: costUsd * egpRate * (1 + global/retail margin)
  merchantBasePriceEgp?: number; // computed before per-merchant margin
  regions?: string[] | null; // allowed regions, null/empty = all
  active?: boolean;
  badge?: string;
  popular?: boolean;
  description?: string;
  raw?: unknown;
}

export interface PlayerValidationResult {
  valid: boolean;
  username?: string;
  userId?: string;
  zoneId?: string;
  accountRegion?: string | null;
  error?: string;
}

export type OrderStatus = "pending" | "processing" | "success" | "failed" | "incomplete" | "cancelled";

export interface CartItem {
  packageId: string; // offerId
  qty: number;
}

export interface OrderItem {
  package_id: string;
  fazer_offer_id: string;
  name: string;
  qty: number;
  unit_price_egp: number;
  unit_cost_usd: number;
  diamonds?: number;
  game_id?: string;
  region?: string | null;
}

export interface OrderRecord {
  id: string;
  order_ref: string;
  user_id?: string | null;
  merchant_id?: string | null;
  player_id: string;
  zone_id?: string | null;
  game_id: string;
  region: string;
  account_region?: string | null;
  status: OrderStatus;
  total_egp: number;
  items: OrderItem[];
  fazer_transaction_id?: string | null;
  fazer_response?: unknown;
  error_message?: string | null;
  delivered_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  role: "admin" | "merchant" | "customer";
  full_name?: string | null;
  phone?: string | null;
  region?: string | null;
}

export interface MerchantAccount {
  id: string;
  user_id: string;
  balance_egp: number;
  margin_percent: number;
  is_active: boolean;
  profile?: Profile | null;
  email?: string | null;
}

export interface WalletLedgerEntry {
  id: string;
  merchant_id: string;
  amount: number;
  entry_type: "admin_credit" | "order_debit" | "refund" | "adjustment";
  reference_type?: string | null;
  reference_id?: string | null;
  balance_after: number;
  note?: string | null;
  created_at: string;
}

export interface MerchantDashboardStats {
  balance_egp: number;
  margin_percent: number;
  orders_today: number;
  delivered_today: number;
  incomplete_orders: number;
}

export interface StoreSettings {
  egp_rate: number;
  fazer_balance?: number | null;
  fazer_balance_currency?: string | null;
  fazer_balance_updated_at?: string | null;
  packages_synced_at?: string | null;
  global_retail_markup_percent: number; // client-side/display setting for retail
}

export interface FazerTopUpResponse {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  status?: string;
  error?: string;
  balanceRemaining?: number;
  raw?: unknown;
}

export interface SystemStatus {
  fazer?: {
    connected: boolean;
    balance?: number;
    currency?: string;
    name?: string;
    message?: string;
  };
  egp_rate?: number;
  packages_synced_at?: string | null;
  fazer_balance_updated_at?: string | null;
}
