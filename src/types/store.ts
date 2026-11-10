export type PackageCategory = "diamonds" | "weekly_pass" | "double_diamonds" | "bundles";

export interface TopUpPackage {
  id: string;
  name: string;
  category: PackageCategory;
  diamonds: number;
  bonusDiamonds?: number;
  fazerProductId: string;
  costPriceUsdt: number;
  merchantPriceEgp: number;
  retailPriceEgp: number;
  merchantPriceUsdt: number;
  retailPriceUsdt: number;
  isCustom?: boolean;
  badge?: string;
  popular?: boolean;
  description?: string;
  active?: boolean;
}

export interface PlayerValidationResult {
  valid: boolean;
  username?: string;
  userId?: string;
  zoneId?: string;
  error?: string;
}

export type OrderStatus = "PENDING" | "PAID" | "TOPPING_UP" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface BinanceOrderCreateResponse {
  success: boolean;
  prepayId?: string;
  merchantTradeNo: string;
  qrContent?: string;
  qrCodeUrl?: string;
  checkoutUrl?: string;
  deeplink?: string;
  expireTime?: number;
  totalFee: number;
  currency: string;
  error?: string;
}

export interface BinanceOrderStatusResponse {
  success: boolean;
  status: "INITIAL" | "PENDING" | "PAID" | "CANCELED" | "ERROR" | "EXPIRED";
  merchantTradeNo: string;
  transactionId?: string;
  paidTime?: number;
  error?: string;
}

export interface FazerTopUpResponse {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  status?: string;
  error?: string;
  balanceRemaining?: number;
}

export interface TopUpOrder {
  id: string;
  userId: string;
  zoneId: string;
  username?: string;
  packageId: string;
  packageName: string;
  diamonds: number;
  priceEgp: number;
  priceUsdt: number;
  isMerchantOrder: boolean;
  binanceTradeNo: string;
  binancePrepayId?: string;
  fazerTransactionId?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface StoreSettings {
  usdtToEgpRate: number;
  globalMarkupPercent: number;
  fazerConnected: boolean;
  binanceConnected: boolean;
  fazerBalanceUsdt?: number;
}
