import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { TopUpPackage, TopUpOrder } from "../types/store";
import { createPaymentOrderApi, checkPaymentStatusApi, executeTopUpApi } from "../lib/api-client";
import { useStore } from "../lib/store/useStore";
import {
  CheckCircle2,
  Loader2,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: TopUpPackage | null;
  userId: string;
  zoneId: string;
  username?: string;
  isMerchant?: boolean;
}

export function CheckoutModal({
  open,
  onOpenChange,
  pkg,
  userId,
  zoneId,
  username,
  isMerchant = false,
}: CheckoutModalProps) {
  const { addOrder, updateOrderStatus } = useStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [orderData, setOrderData] = useState<{
    merchantTradeNo: string;
    prepayId?: string;
    qrCodeUrl?: string;
    checkoutUrl?: string;
    deeplink?: string;
    totalFee: number;
    currency: string;
  } | null>(null);

  const [paymentStatus, setPaymentStatus] = useState<
    "INITIAL" | "AWAITING_PAYMENT" | "PAYMENT_RECEIVED" | "TOPPING_UP" | "SUCCESS" | "FAILED"
  >("INITIAL");
  const [topUpResult, setTopUpResult] = useState<{
    transactionId?: string;
    orderId?: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localOrderIdRef = useRef<string | null>(null);

  // Price calculations based on mode
  const priceEgp = pkg ? (isMerchant ? pkg.merchantPriceEgp : pkg.retailPriceEgp) : 0;
  const priceUsdt = pkg ? (isMerchant ? pkg.merchantPriceUsdt : pkg.retailPriceUsdt) : 0;

  // Initialize or reset when modal opens
  useEffect(() => {
    if (!open || !pkg) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setPaymentStatus("INITIAL");
      setOrderData(null);
      setError(null);
      setTopUpResult(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setPaymentStatus("AWAITING_PAYMENT");
    setTimeLeft(900);

    const tradeNo = `MLBB_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
    const newOrderId = `ORD-${Date.now()}`;
    localOrderIdRef.current = newOrderId;

    // Create Binance Pay order
    createPaymentOrderApi({
      merchantTradeNo: tradeNo,
      orderAmount: priceUsdt,
      currency: "USDT",
      goodsTitle: `${pkg.name} - MLBB Top Up`,
      goodsDetail: `MLBB diamonds topup for UID ${userId} (${zoneId})`,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.qrCodeUrl) {
          setOrderData({
            merchantTradeNo: res.merchantTradeNo,
            prepayId: res.prepayId,
            qrCodeUrl: res.qrCodeUrl,
            checkoutUrl: res.checkoutUrl,
            deeplink: res.deeplink,
            totalFee: res.totalFee,
            currency: res.currency,
          });

          // Save initial order in local store
          const initialOrder: TopUpOrder = {
            id: newOrderId,
            userId,
            zoneId,
            username: username || "MLBB Player",
            packageId: pkg.id,
            packageName: pkg.name,
            diamonds: pkg.diamonds + (pkg.bonusDiamonds || 0),
            priceEgp,
            priceUsdt,
            isMerchantOrder: isMerchant,
            binanceTradeNo: res.merchantTradeNo,
            binancePrepayId: res.prepayId,
            status: "PENDING",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          addOrder(initialOrder);

          // Start polling for payment confirmation
          startPolling(res.merchantTradeNo, newOrderId);
        } else {
          setError(res.error || "تعذر إنشاء معاملة الدفع عبر Binance Pay");
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "حدث خطأ في الاتصال بالخادم");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Start countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, pkg, userId, zoneId, isMerchant, priceUsdt, priceEgp, username, addOrder]);

  // Polling mechanism
  const startPolling = (tradeNo: string, currentOrderId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const queryRes = await checkPaymentStatusApi(tradeNo);

        if (queryRes.status === "PAID") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPaymentStatus("PAYMENT_RECEIVED");

          // Trigger FazerCards topup
          setTimeout(() => {
            fulfillTopUp(tradeNo, currentOrderId);
          }, 800);
        }
      } catch (e) {
        console.warn("Payment polling error:", e);
      }
    }, 2500);
  };

  // Fulfill Top-up via FazerCards
  const fulfillTopUp = async (tradeNo: string, currentOrderId: string) => {
    if (!pkg) return;
    setPaymentStatus("TOPPING_UP");
    updateOrderStatus(currentOrderId, "TOPPING_UP");

    try {
      const topUpRes = await executeTopUpApi({
        offerId: pkg.fazerProductId,
        playerId: userId,
        zoneId,
        idempotencyKey: tradeNo,
      });

      if (topUpRes.success) {
        setTopUpResult({
          transactionId: topUpRes.transactionId,
          orderId: topUpRes.orderId,
        });
        setPaymentStatus("SUCCESS");
        updateOrderStatus(currentOrderId, "SUCCESS", {
          fazerTransactionId: topUpRes.transactionId,
        });
      } else {
        setError(
          topUpRes.error ||
            "تم استلام الدفع ولكن واجه مزود الشحن FazerCards مشكلة. تواصل مع الدعم برقم المعاملة.",
        );
        setPaymentStatus("FAILED");
        updateOrderStatus(currentOrderId, "FAILED", {
          errorMessage: topUpRes.error,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء تنفيذ الشحن";
      setError(message);
      setPaymentStatus("FAILED");
      updateOrderStatus(currentOrderId, "FAILED", {
        errorMessage: message,
      });
    }
  };

  const copyReceipt = () => {
    const text = `
إيصال شحن Mobile Legends: Bang Bang
------------------------------------
رقم الطلب: ${localOrderIdRef.current || ""}
معرف اللاعب: ${userId} (${zoneId})
اسم الحساب: ${username || "MLBB Hero"}
الباقة: ${pkg?.name || ""}
الجواهر: ${pkg ? pkg.diamonds + (pkg.bonusDiamonds || 0) : ""} جوهرة
المبلغ: ${priceUsdt} USDT (${priceEgp} EGP)
معاملة Binance: ${orderData?.merchantTradeNo || ""}
معاملة Fazer: ${topUpResult?.transactionId || "قيد المعالجة"}
الحالة: ناجحة ومكتملة ✓
------------------------------------
MLBB Top-Up Hub
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0b0f1d] border border-cyan-500/30 text-slate-100 p-0 overflow-hidden rounded-2xl shadow-2xl shadow-cyan-950/60 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d162d] to-[#17102e] border-b border-cyan-500/20 px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">
                    {isMerchant ? "شحن فوري - بوابة التاجر" : "تأكيد الشحن والدفع عبر Binance Pay"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    دفع مشفر آمن وفوري بنسبة 100%
                  </DialogDescription>
                </div>
              </div>
              <span className="font-mono text-xs text-cyan-300 rounded bg-cyan-950/60 px-2 py-1 border border-cyan-500/30">
                {formatTime(timeLeft)}
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Order Details Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-cyan-400">الباقة المختارة:</span>
                <h4 className="font-bold text-white text-base mt-0.5">{pkg?.name}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                  <span className="text-purple-400 font-semibold">
                    {pkg ? pkg.diamonds + (pkg.bonusDiamonds || 0) : 0} جوهرة
                  </span>
                  <span>•</span>
                  <span>
                    حساب: <span className="font-mono text-cyan-300">{userId}</span> ({zoneId})
                  </span>
                </div>
                {username && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      الاسم داخل اللعبة: <strong>{username}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">المبلغ المطلوب:</span>
                <div className="text-lg font-extrabold text-cyan-400">{priceUsdt} USDT</div>
                <div className="text-xs text-slate-400">{priceEgp} EGP</div>
              </div>
            </div>
          </div>

          {/* Conditional Content based on status */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-300">جاري إنشاء جلسة دفع Binance Pay المشفرة...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-300 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">حدث خطأ</p>
                <p className="text-xs text-rose-200">{error}</p>
              </div>
            </div>
          )}

          {/* Payment Pending Stage */}
          {!loading && !error && paymentStatus === "AWAITING_PAYMENT" && orderData && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0e1628] to-[#0b101d] p-5 shadow-lg">
                <p className="text-xs text-slate-300 mb-3 text-center">
                  امسح الرمز بواسطة تطبيق <strong className="text-amber-400">Binance</strong> لإتمام
                  السداد الفوري
                </p>

                {/* QR Code Container */}
                <div className="relative rounded-xl bg-white p-3 shadow-xl ring-4 ring-cyan-500/20">
                  <img
                    src={orderData.qrCodeUrl}
                    alt="Binance Pay QR Code"
                    className="h-52 w-52 object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-slate-900/90 border border-amber-400 flex items-center justify-center shadow-lg">
                      <span className="font-bold text-amber-400 text-xs">PAY</span>
                    </div>
                  </div>
                </div>

                {/* Polling Indicator */}
                <div className="mt-4 flex items-center gap-2 text-xs text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-3 py-1.5 rounded-full">
                  <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />
                  <span>بانتظار تأكيد الدفع التلقائي...</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {orderData.deeplink && (
                  <a
                    href={orderData.deeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 text-xs transition-colors shadow-md shadow-amber-500/20"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>فتح تطبيق Binance Pay</span>
                  </a>
                )}

                {orderData.checkoutUrl && (
                  <a
                    href={orderData.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-4 text-xs transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>الدفع عبر المتصفح</span>
                  </a>
                )}
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>رقم المعاملة:</span>
                  <span className="font-mono text-slate-300">{orderData.merchantTradeNo}</span>
                </div>
                {orderData.prepayId && (
                  <div className="flex justify-between">
                    <span>Prepay ID:</span>
                    <span className="font-mono text-slate-300">{orderData.prepayId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Received / Topping Up */}
          {(paymentStatus === "PAYMENT_RECEIVED" || paymentStatus === "TOPPING_UP") && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تم استلام الدفعة بنجاح!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  جاري الآن إرسال أمر الشحن الفوري إلى خوادم FazerCards...
                </p>
              </div>
            </div>
          )}

          {/* Success Screen */}
          {paymentStatus === "SUCCESS" && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-[#0c1622] p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="h-8 w-8" />
                </div>

                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-lg">
                  <Sparkles className="h-5 w-5" />
                  <span>تم الشحن بنجاح وفورياً!</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  تم شحن {pkg ? pkg.diamonds + (pkg.bonusDiamonds || 0) : 0} جوهرة لحساب اللاعب{" "}
                  {userId} بنجاح.
                </p>

                {/* Details Breakdown */}
                <div className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-xs text-slate-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">حساب اللاعب:</span>
                    <span className="font-bold text-white">
                      {username || userId} ({zoneId})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">رقم معاملة FazerCards:</span>
                    <span className="font-mono text-cyan-400">
                      {topUpResult?.transactionId || "FZR-OK"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">رقم معاملة Binance:</span>
                    <span className="font-mono text-purple-400">{orderData?.merchantTradeNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المبلغ المسدد:</span>
                    <span className="font-bold text-emerald-400">
                      {priceUsdt} USDT ({priceEgp} EGP)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={copyReceipt}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 font-semibold py-2.5 text-xs transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{copied ? "تم نسخ الإيصال" : "نسخ إيصال العملية"}</span>
                </button>

                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-2.5 text-xs transition-all shadow-md shadow-cyan-500/20"
                >
                  إتمام وإغلاق
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
