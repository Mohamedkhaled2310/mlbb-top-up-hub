export type PackageCategory = "diamonds" | "weekly_pass" | "double_diamonds" | "bundles" | string;

export type SerializablePrimitive = string | number | boolean | null;
export type SerializableJson =
  | SerializablePrimitive
  | SerializableJson[]
  | { [key: string]: SerializableJson | undefined };

export interface TopUpPackage {
  id: string;
  offerId: string; // fazer offer/product id (fazer_packages.offer_id)
  gameId?: "mlbb" | "pubg" | "freefire" | "hok" | string | undefined;
  fazerCategoryId?: string | undefined;
  name: string;
  category: PackageCategory;
  diamonds: number;
  bonusDiamonds?: number | undefined;
  currencyName?: string | undefined;
  costUsd: number; // from Fazer
  retailPriceEgp: number; // computed: costUsd * egpRate * (1 + global/retail margin)
  merchantBasePriceEgp?: number | undefined; // computed before per-merchant margin
  regions?: string[] | null | undefined; // allowed regions, null/empty = all
  active?: boolean | undefined;
  badge?: string | undefined;
  popular?: boolean | undefined;
  description?: string | undefined;
  raw?: Record<string, SerializablePrimitive> | null | undefined;
}

export interface PlayerInfo {
  id: string;
  zoneId?: string | undefined;
  region?: string | undefined;
  name?: string | undefined;
}

export interface PlayerValidationResult {
  valid: boolean;
  username?: string | undefined;
  userId?: string | undefined;
  zoneId?: string | undefined;
  accountRegion?: string | null | undefined;
  error?: string | undefined;
}

export type OrderStatus = "pending" | "processing" | "success" | "failed" | "incomplete" | "cancelled";

export interface CartItem {
  packageId?: string | undefined;
  package: TopUpPackage;
  qty: number;
}

export interface OrderItem {
  package_id: string;
  fazer_offer_id: string;
  fazer_category_id?: string | undefined;
  name: string;
  qty: number;
  unit_price_egp: number;
  unit_cost_usd: number;
  diamonds?: number | undefined;
  game_id?: string | undefined;
  region?: string | null | undefined;
}

export interface OrderRecord {
  id: string;
  order_ref: string;
  user_id?: string | null | undefined;
  merchant_id?: string | null | undefined;
  player_id: string;
  zone_id?: string | null | undefined;
  game_id: string;
  region: string;
  account_region?: string | null | undefined;
  status: OrderStatus;
  total_egp: number;
  items: OrderItem[];
  fazer_transaction_id?: string | null | undefined;
  fazer_response?: SerializableJson | undefined;
  error_message?: string | null | undefined;
  delivered_at?: string | null | undefined;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  role: "admin" | "merchant" | "customer";
  full_name?: string | null | undefined;
  phone?: string | null | undefined;
  region?: string | null | undefined;
}

export interface MerchantAccount {
  id: string;
  user_id: string;
  balance_egp: number;
  margin_percent: number;
  is_active: boolean;
  profile?: Profile | null | undefined;
  email?: string | null | undefined;
}

export interface WalletLedgerEntry {
  id: string;
  merchant_id: string;
  amount: number;
  entry_type: "admin_credit" | "order_debit" | "refund" | "adjustment";
  reference_type?: string | null | undefined;
  reference_id?: string | null | undefined;
  balance_after: number;
  note?: string | null | undefined;
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
  fazer_balance?: number | null | undefined;
  fazer_balance_currency?: string | null | undefined;
  fazer_balance_updated_at?: string | null | undefined;
  packages_synced_at?: string | null | undefined;
  global_retail_markup_percent: number; // client-side/display setting for retail
  fx_rates?: Record<string, number> | undefined;
  fx_updated_at?: string | null | undefined;
}

export interface FazerTopUpResponse {
  success: boolean;
  transactionId?: string | undefined;
  orderId?: string | undefined;
  status?: string | undefined;
  error?: string | undefined;
  balanceRemaining?: number | undefined;
  raw?: SerializableJson | undefined;
}

export interface SystemStatus {
  fazer?: {
    connected: boolean;
    balance?: number | undefined;
    currency?: string | undefined;
    name?: string | undefined;
    message?: string | undefined;
  } | undefined;
  egp_rate?: number | undefined;
  fazer_balance?: number | null | undefined;
  fazer_balance_currency?: string | null | undefined;
  packages_synced_at?: string | null | undefined;
  fazer_balance_updated_at?: string | null | undefined;
}

export interface AuthSessionPayload {
  accessToken: string;
  refreshToken?: string | undefined;
  expiresAt?: number | undefined;
  user: {
    id: string;
    email?: string | null | undefined;
  };
  profile: Profile | null;
  merchant: {
    id: string;
    balance_egp: number;
    margin_percent: number;
    is_active: boolean;
  } | null;
}
