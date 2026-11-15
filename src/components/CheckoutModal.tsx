import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Globe,
  Loader2,
  Package,
  Share2,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useStore, getFreshAuthToken } from "@/lib/store/useStore";
import { calcMerchantUnitPriceEgp, formatDecimals3, round3 } from "@/lib/pricing";
import { getServerLabel } from "@/lib/regions";
import { getCountryCurrencyInfo } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "../hooks/use-toast";
import { getOrderStatusApi, submitOrderApi, validatePlayerApi } from "@/lib/api-client";
import { CopyButton } from "./CopyButton";
import { findCachedPlayer, saveRecentAccount } from "../lib/recent-players";
import type { CartItem } from "@/types/store";

type CheckoutStep = "form" | "processing" | "success" | "failed";

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (packageId: string, qty: number) => void;
  onRemove: (packageId: string) => void;
  onClear: () => void;
  onOrderSuccess?: ((result: any) => void | Promise<void>) | undefined;
}

export default function CheckoutModal({
  open,
  onClose,
  cart,
  onUpdateQty,
  onRemove,
  onClear,
  onOrderSuccess,
}: Props) {
  const { player, setPlayer, isMerchant, accessToken, merchant, settings, profile, setAuth } = useStore();
  const [step, setStep] = useState<CheckoutStep>("form");
  const [region, setRegion] = useState(player.region || "");
  const [result, setResult] = useState<any>(null);
  const [paidTotal, setPaidTotal] = useState<number>(0);
  const [summaryGameId, setSummaryGameId] = useState<string>("mlbb");
  const [summaryRegion, setSummaryRegion] = useState<string>("global");
  const [validating, setValidating] = useState(false);
  const [verifiedPlayerName, setVerifiedPlayerName] = useState<string | null>(player.name || null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const submitted = useRef(false);
  const latestRegionRef = useRef(player.region || "");
  latestRegionRef.current = player.region || "";

  useEffect(() => {
    if (open) {
      setStep("form");
      setResult(null);
      setPaidTotal(0);
      setVerifiedPlayerName(player.name || null);
      setValidationError(null);
      setValidating(false);
      const pkgServer =
        (Array.isArray(cart[0]?.package.regions) && cart[0]?.package.regions[0]) ||
        latestRegionRef.current ||
        player.region ||
        "global";
      setRegion(pkgServer.toLowerCase());
      submitted.current = false;
    }
  }, [open, cart, player.region, player.name]);

  // Real-time automatic polling when order is placed and in processing/pending state (ultra-fast every 300ms)
  useEffect(() => {
    if (!open || step !== "success" || !result?.order_ref) return;
    if (result.status !== "processing" && result.status !== "pending") return;

    let inFlight = false;
    const interval = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const check = await getOrderStatusApi(result.order_ref, accessToken);
        if (check?.found && check.status && check.status !== result.status) {
          setResult((prev: any) => ({
            ...prev,
            status: check.status,
            message:
              check.status === "success"
                ? "تم تنفيذ الشحن بنجاح وتسليم الباقة في اللعبة. 🎉"
                : check.status === "failed"
                  ? "تعذر تنفيذ الشحن وتم استرداد الرصيد إلى محفظتك"
                  : prev?.message,
          }));
        }
      } catch {
      } finally {
        inFlight = false;
      }
    }, 300);

    return () => clearInterval(interval);
  }, [open, step, result?.order_ref, result?.status, accessToken]);

  if (!open) return null;

  const activeGameId = cart[0]?.package.gameId || "mlbb";
  const needsZone = activeGameId === "mlbb";
  const merchantMargin = Number(merchant?.margin_percent || 0);
  const egpRate = Number(settings.egp_rate || 50);

  // Determine if this is a USD merchant account
  const merchantRegion = profile?.region || merchant?.region || "eg";
  const currencyInfo = getCountryCurrencyInfo(merchantRegion);
  const isUsdMerchant = isMerchant && currencyInfo.currency === "USD";

  const getItemUnitPrice = (item: CartItem): number => {
    if (isMerchant) {
      const entry = (merchant as any)?.custom_prices?.[item.package.offerId];
      const customUsd =
        typeof entry === "object" && entry !== null && typeof entry.price_usd === "number"
          ? entry.price_usd
          : typeof entry === "number" && entry > 0
            ? entry
            : null;
      if (typeof customUsd === "number" && customUsd > 0) return round3(customUsd * egpRate);
      const base = item.package.merchantBasePriceEgp ?? item.package.retailPriceEgp;
      return calcMerchantUnitPriceEgp(base, merchantMargin, item.package.costUsd, egpRate);
    }
    return item.package.retailPriceEgp;
  };

  const getItemUnitPriceUsd = (item: CartItem): number => {
    const entry = (merchant as any)?.custom_prices?.[item.package.offerId];
    const customUsd =
      typeof entry === "object" && entry !== null && typeof entry.price_usd === "number"
        ? entry.price_usd
        : typeof entry === "number" && entry > 0
          ? entry
          : null;
    if (typeof customUsd === "number" && customUsd > 0) return round3(customUsd);
    const unitEgp = getItemUnitPrice(item);
    return round3(unitEgp / egpRate);
  };

  const totalEgp = round3(cart.reduce((sum, item) => sum + item.qty * getItemUnitPrice(item), 0));
  const totalUsd = round3(cart.reduce((sum, item) => sum + item.qty * getItemUnitPriceUsd(item), 0));
  const total = totalEgp;

  const handleValidatePlayer = async () => {
    const rawId = (player.id || "").trim();
    const rawZone = (player.zoneId || "").trim();
    if (!rawId) {
      toast({ title: "معرف اللاعب مطلوب", description: "يرجى كتابة الـ Player ID أولاً لفحصه" });
      return;
    }
    if (needsZone && !rawZone) {
      toast({ title: "رقم السيرفر مطلوب", description: "يرجى كتابة معرف السيرفر (Zone ID) لفحص الحساب" });
      return;
    }

    // Instant local cache check (0ms response)
    const cached = findCachedPlayer(activeGameId, rawId, rawZone);
    if (cached && cached.name) {
      setVerifiedPlayerName(cached.name);
      setPlayer({ ...player, name: cached.name, region: cached.region || region || "global" });
      if (cached.region) setRegion(cached.region);
      toast({
        title: "تم التحقق الفوري (ذاكرة سريعة) ⚡",
        description: `اسم اللاعب: ${cached.name}`,
      });
      return;
    }

    setValidating(true);
    setValidationError(null);
    try {
      const categoryId = cart[0]?.package.fazerCategoryId;
      const res = await validatePlayerApi(
        rawId,
        rawZone,
        activeGameId,
        region || undefined,
        categoryId,
      );

      if (res.valid) {
        const username = res.username || "لاعب معتمد";
        const accRegion = res.accountRegion || region || "global";
        setVerifiedPlayerName(username);
        setPlayer({ ...player, name: username, region: accRegion });
        if (res.accountRegion) {
          setRegion(res.accountRegion);
        }
        saveRecentAccount({
          id: rawId,
          zoneId: rawZone,
          name: username,
          region: accRegion,
          gameId: activeGameId,
        });
        toast({
          title: "تم التحقق من الحساب بنجاح ✅",
          description: `اسم اللاعب: ${username}${res.accountRegion ? ` • سيرفر: ${getServerLabel(res.accountRegion, activeGameId)}` : ""}`,
        });
      } else {
        setVerifiedPlayerName(null);
        setValidationError(res.error || "تعذر التحقق من صحة المعرف، يرجى مراجعة الـ ID والسيرفر.");
        toast({
          title: "تعذر التحقق من الحساب ❌",
          description: res.error || "تأكد من كتابة الـ ID والسيرفر بشكل صحيح",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      setVerifiedPlayerName(null);
      setValidationError(e?.message || "حدث خطأ أثناء فحص بيانات الحساب");
    } finally {
      setValidating(false);
    }
  };

  const submit = async () => {
    if (submitted.current) return;
    if (!player.id.trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال معرف اللاعب أولاً" });
      return;
    }
    if (needsZone && !(player.zoneId || "").trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال رقم السيرفر (Zone ID)" });
      return;
    }
    if (!cart.length) {
      toast({ title: "السلة فارغة", description: "اختر باقة واحدة على الأقل" });
      return;
    }

    submitted.current = true;
    const currentTotal = totalEgp;
    const currentGame = activeGameId;
    const currentRegion = region.trim() || "global";
    setPaidTotal(currentTotal);
    setSummaryGameId(currentGame);
    setSummaryRegion(currentRegion);
    setStep("processing");

    // Save recent account immediately for fast, seamless re-use
    saveRecentAccount({
      id: player.id.trim(),
      zoneId: player.zoneId?.trim(),
      name: verifiedPlayerName || player.name || player.id.trim(),
      region: currentRegion,
      gameId: currentGame,
    });

    const clientOrderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    try {
      let effectiveToken = accessToken;
      if (isMerchant) {
        try {
          const fresh = await getFreshAuthToken();
          if (fresh) {
            effectiveToken = fresh;
          }
        } catch {}
      }

      const body = {
        clientOrderId,
        playerId: player.id.trim(),
        zoneId: (player.zoneId || "").trim(),
        playerName: verifiedPlayerName || player.name || undefined,
        accountRegion: currentRegion,
        gameId: currentGame,
        region: currentRegion,
        items: cart.map((c) => ({ offerId: c.package.offerId, qty: c.qty })),
        asMerchant: isMerchant,
      };

      let res: any;
      try {
        res = await submitOrderApi(body, effectiveToken);
      } catch (fetchErr: any) {
        // If network error occurred, immediately query status endpoint without delay
        try {
          const statusCheck = await getOrderStatusApi(clientOrderId, effectiveToken);
          if (statusCheck?.found) {
            res = {
              success: statusCheck.status === "success" || statusCheck.status === "processing",
              order_ref: statusCheck.order_ref,
              status: statusCheck.status,
              total_egp: statusCheck.total_egp,
              game_id: statusCheck.game_id,
              player_name: verifiedPlayerName || player.id.trim(),
              error: statusCheck.error_message,
              message:
                statusCheck.status === "success"
                  ? "تم تنفيذ الشحن بنجاح وتسليم الباقة في اللعبة. 🎉"
                  : "تم استلام الطلب وهو قيد المعالجة بالسيرفر حالياً ⏳",
            };
          } else {
            throw fetchErr;
          }
        } catch {
          throw fetchErr;
        }
      }

      setResult(res);

      if (typeof res?.total_egp === "number" && res.total_egp > 0) {
        setPaidTotal(res.total_egp);
      }
      if (typeof res?.balance_egp === "number" && effectiveToken && merchant) {
        setAuth(effectiveToken, profile, { ...merchant, balance_egp: res.balance_egp });
      }

      if (res?.success) {
        setStep("success");
        onClear();
        if (onOrderSuccess) {
          await onOrderSuccess(res);
        }
      } else {
        setStep("failed");
        if (onOrderSuccess) {
          await onOrderSuccess(res);
        }
      }
    } catch (e: any) {
      const isFetchErr = String(e?.message || "").toLowerCase().includes("fetch");
      const friendlyMsg = isFetchErr
        ? "تعذر التأكد من حالة الطلب بسبب انقطاع مؤقت في الشبكة. يرجى مراجعة سجل الطلبات قبل إعادة المحاولة."
        : e?.message || "حدث خطأ غير متوقع أثناء معالجة الشحن";
      setResult({ error: friendlyMsg, isNetworkTimeout: isFetchErr });
      setStep("failed");
    } finally {
      submitted.current = false;
    }
  };

  const outlineBtn = "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white";
  const primaryBtn = isMerchant
    ? "bg-purple-600 hover:bg-purple-500 text-white"
    : "bg-rose-600 hover:bg-rose-500 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={step !== "processing" ? onClose : undefined}
      />
      <div className="relative w-full sm:max-w-xl bg-[#0b1020] border border-slate-700/80 text-slate-100 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={step === "processing"}
          aria-label="إغلاق"
          className="absolute top-3 end-3 sm:top-4 sm:end-4 h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clean Header */}
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-base sm:text-lg text-white">تأكيد الشحن الفوري</h3>
          <span className="text-[10px] rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-cyan-300 font-mono uppercase">
            {activeGameId}
          </span>
        </div>

        {/* Form View (Direct Fast Checkout) */}
        {step === "form" && (
          <div className="space-y-4 pt-1">
            {/* Player ID & Server ID inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-sm text-slate-300 font-medium">معرف اللاعب (Player ID) *</label>
                <Input
                  value={player.id}
                  onChange={(e) => {
                    const newId = e.target.value;
                    const cached = findCachedPlayer(activeGameId, newId, player.zoneId);
                    setPlayer({ ...player, id: newId, name: cached?.name });
                    if (cached?.name) {
                      setVerifiedPlayerName(cached.name);
                    } else {
                      setVerifiedPlayerName(null);
                    }
                    setValidationError(null);
                  }}
                  placeholder="مثال: 12345678"
                  className="mt-1 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 font-mono"
                />
              </div>

              {needsZone ? (
                <div>
                  <label className="text-xs sm:text-sm text-slate-300 font-medium">معرف السيرفر (Zone ID) *</label>
                  <Input
                    value={player.zoneId || ""}
                    onChange={(e) => {
                      const newZone = e.target.value;
                      const cached = findCachedPlayer(activeGameId, player.id, newZone);
                      setPlayer({ ...player, zoneId: newZone, name: cached?.name });
                      if (cached?.name) {
                        setVerifiedPlayerName(cached.name);
                      } else {
                        setVerifiedPlayerName(null);
                      }
                      setValidationError(null);
                    }}
                    placeholder="مثال: 2024"
                    className="mt-1 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 font-mono"
                  />
                </div>
              ) : null}
            </div>

            {/* Check/Verify Player Info Button */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                disabled={validating || !player.id.trim() || (needsZone && !(player.zoneId || "").trim())}
                onClick={handleValidatePlayer}
                className="w-full sm:w-auto h-9 px-4 text-xs font-bold gap-2 border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition-all disabled:opacity-40 rounded-xl"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>جاري التحقق من السيرفر...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>التحقق من بيانات اللاعب 🔍</span>
                  </>
                )}
              </Button>
              {verifiedPlayerName && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تم الفحص وتأكيد الحساب</span>
                </span>
              )}
            </div>

            {/* Verified Player Info Card */}
            {verifiedPlayerName && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-emerald-400/80 font-medium">اسم اللاعب المسجل في اللعبة:</div>
                    <div className="text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                      <span>{verifiedPlayerName}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    حساب مؤكد ومطابق ✓
                  </span>
                </div>
              </div>
            )}

            {/* Validation Error Message */}
            {validationError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-2.5 flex items-center gap-2 text-xs text-rose-300 animate-in fade-in duration-200">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="flex-1">{validationError}</span>
              </div>
            )}

            {/* Selected Server Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/80 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>سيرفر الشحن المحدد للباقة:</span>
              </span>
              <span className="font-bold text-purple-300 bg-purple-950/70 border border-purple-500/30 px-2.5 py-0.5 rounded-md text-[11px]">
                {getServerLabel(region || "global", activeGameId)}
              </span>
            </div>

            {/* Cart Items Summary */}
            <div className="border border-slate-700 rounded-xl p-3 space-y-2 bg-slate-900/50">
              <div className="font-semibold flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" /> السلة ({cart.length})
                </span>
                {isMerchant && (
                  <span className="text-[11px] rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5">
                    أسعار التاجر المعتمدة
                  </span>
                )}
              </div>
              {cart.length === 0 && <p className="text-sm text-slate-400">السلة فارغة. اختر باقات من القائمة.</p>}
              {cart.map((it) => {
                const unitEgp = getItemUnitPrice(it);
                const unitUsd = getItemUnitPriceUsd(it);
                const pkgServer = (Array.isArray(it.package.regions) && it.package.regions[0]) || "global";
                return (
                  <div
                    key={it.package.id}
                    className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-800/80 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{it.package.name}</div>
                      <div className="text-slate-400 text-xs flex items-center gap-1.5 flex-wrap">
                        {isUsdMerchant ? (
                          <span>${formatDecimals3(unitUsd)} USD × {it.qty}</span>
                        ) : (
                          <span>{unitEgp} ج.م × {it.qty}</span>
                        )}
                        <span className="text-slate-600">•</span>
                        <span className="text-cyan-300 font-mono text-[10px] uppercase font-bold">
                          سيرفر {pkgServer.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineBtn} h-8 w-8 p-0`}
                        onClick={() => onUpdateQty(it.package.id, Math.max(1, it.qty - 1))}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center font-semibold">{it.qty}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineBtn} h-8 w-8 p-0`}
                        onClick={() => onUpdateQty(it.package.id, it.qty + 1)}
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-rose-800 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white"
                        onClick={() => onRemove(it.package.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2 border-t border-slate-700 font-bold">
                <span>الإجمالي</span>
                <div className="text-left font-mono">
                  {isUsdMerchant ? (
                    <div>
                      <span className="text-purple-300 font-bold text-base sm:text-lg">${formatDecimals3(totalUsd)} USD</span>
                      <span className="text-slate-400 text-xs block font-normal">({formatDecimals3(totalEgp)} ج.م)</span>
                    </div>
                  ) : (
                    <span className="text-rose-400 font-bold text-base sm:text-lg">{formatDecimals3(totalEgp)} ج.م</span>
                  )}
                </div>
              </div>
            </div>

            {/* Merchant / Customer Information Notice */}
            {!isMerchant ? (
              <div className="flex gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>تنفيذ فوري مباشر عبر سيرفر الشحن الآلي المعتمد بمجرد تأكيد الطلب.</span>
              </div>
            ) : (
              <div className="flex gap-2 text-xs text-purple-300 bg-purple-950/30 border border-purple-800/50 p-3 rounded-xl">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                <span>
                  {isUsdMerchant ? (
                    <>
                      كتاجر: سيتم خصم <b>${formatDecimals3(totalUsd)} USD</b> ({formatDecimals3(totalEgp)} ج.م) من محفظتك ذرياً مع استرداد تلقائي فوري إذا تعذر التنفيذ.
                    </>
                  ) : (
                    <>
                      كتاجر: سيتم خصم <b>{formatDecimals3(totalEgp)} ج.م</b> من محفظتك ذرياً مع استرداد تلقائي فوري إذا تعذر التنفيذ.
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Direct Instant Action Button */}
            <Button
              className={`w-full h-11 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 ${primaryBtn}`}
              onClick={submit}
              disabled={!cart.length || !player.id.trim() || (needsZone && !(player.zoneId || "").trim())}
            >
              <Zap className="w-4 h-4" />
              <span>دفع وتأكيد الشحن الفوري</span>
            </Button>
          </div>
        )}

        {/* Processing State (Fast & Direct Loading) */}
        {step === "processing" && (
          <div className="py-10 sm:py-12 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
              <Zap className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-extrabold text-white">جاري تنفيذ عملية الشحن...</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                يتم الاتصال بسيرفر اللعبة وتأكيد الطلب وتسليم الباقة مباشرة.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold animate-pulse">
              <span>يرجى الانتظار لحظات...</span>
            </div>
          </div>
        )}

        {/* Success / Result State (Invoice / Receipt) */}
        {step === "success" && (
          <div className="py-5 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
                result?.status === "processing" || result?.status === "pending"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              }`}
            >
              {result?.status === "processing" || result?.status === "pending" ? (
                <Clock className="w-8 h-8 animate-spin" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>
            <div>
              <div
                className={`font-extrabold text-xl ${
                  result?.status === "processing" || result?.status === "pending" ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {result?.status === "processing" || result?.status === "pending"
                  ? "تم الدفع وتأكيد الطلب بنجاح! ⚡"
                  : "تم تنفيذ الشحن بنجاح! 🎉"}
              </div>
              <div
                className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                  result?.status === "processing" || result?.status === "pending" ? "text-slate-300" : "text-emerald-300"
                }`}
              >
                {result?.status === "processing" || result?.status === "pending"
                  ? "تم خصم الرصيد وتمرير الشحن للسيرفر، برجاء انتظار إضافة الجواهر في اللعبة خلال ثوانٍ ⏳"
                  : (result?.message || "تم تنفيذ الطلب وتسليم الباقات فورياً إلى حساب اللاعب.")}
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3.5 text-xs text-right space-y-2 font-sans">
              {result?.order_ref && (
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">رقم الطلب:</span>
                  <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-bold">
                    <span>{result.order_ref}</span>
                    <CopyButton text={result.order_ref} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">حالة الشحن:</span>
                <span
                  className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border ${
                    result?.status === "processing" || result?.status === "pending"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {result?.status === "processing" || result?.status === "pending"
                    ? "قيد المعالجة ⏳"
                    : "مكتمل بنجاح ✅"}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">حساب اللاعب:</span>
                <div className="flex items-center gap-1.5 font-mono text-white">
                  <span>{(verifiedPlayerName || player.name) ? `${verifiedPlayerName || player.name} (${player.id})` : player.id}</span>
                  {player.zoneId && <span className="text-slate-400">({player.zoneId})</span>}
                  <CopyButton text={player.id} />
                </div>
              </div>
              {/* Package and Diamonds Details */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">الباقة المشحونة:</span>
                <div className="text-right">
                  <div className="font-semibold text-purple-300">
                    {cart.map((c) => `${c.qty > 1 ? `${c.qty}x ` : ""}${c.package.name}`).join(" + ") || "باقة شحن"}
                  </div>
                  {cart.some((c) => Number(c.package.diamonds) > 0) && (
                    <div className="text-emerald-400 font-mono text-[11px] font-bold">
                      💎{" "}
                      {cart.reduce(
                        (s, c) => s + (Number(c.package.diamonds || 0) + Number(c.package.bonusDiamonds || 0)) * c.qty,
                        0,
                      )}{" "}
                      جوهرة
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">اللعبة والمنطقة:</span>
                <span className="font-semibold text-slate-200">
                  {(result?.game_id || summaryGameId || activeGameId).toUpperCase()} •{" "}
                  {result?.region || summaryRegion || region || "Global"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">المبلغ الإجمالي:</span>
                <span className="font-bold text-base text-rose-400 font-mono">
                  {isUsdMerchant ? (
                    <>
                      ${formatDecimals3(totalUsd)} USD{" "}
                      <span className="text-xs font-normal text-slate-400">
                        (
                        {formatDecimals3(
                          typeof result?.total_egp === "number" && result.total_egp > 0
                            ? result.total_egp
                            : paidTotal || totalEgp,
                        )}{" "}
                        ج.م)
                      </span>
                    </>
                  ) : (
                    <>
                      {formatDecimals3(
                        typeof result?.total_egp === "number" && result.total_egp > 0
                          ? result.total_egp
                          : paidTotal || totalEgp,
                      )}{" "}
                      ج.م
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold h-11 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 rounded-xl transition-all"
                onClick={() => {
                  onClose();
                  if (typeof window !== "undefined") {
                    if (window.location.pathname.includes("/merchant")) {
                      const board = document.getElementById("merchant-orders-board");
                      if (board) {
                        board.scrollIntoView({ behavior: "smooth" });
                      }
                    } else if (isMerchant) {
                      window.location.href = "/merchant#merchant-orders-board";
                    }
                  }
                }}
              >
                <ClipboardList className="w-4 h-4" />
                <span>الانتقال إلى لوحة الطلبات (Dashboard) 📋</span>
              </Button>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 flex items-center justify-center gap-2 rounded-xl"
                  onClick={() => {
                    const finalPaidEgp = formatDecimals3(
                      typeof result?.total_egp === "number" && result.total_egp > 0
                        ? result.total_egp
                        : paidTotal || totalEgp,
                    );
                    const finalPaidStr = isUsdMerchant
                      ? `$${formatDecimals3(totalUsd)} USD (${finalPaidEgp} ج.م)`
                      : `${finalPaidEgp} ج.م`;
                    const finalGame = (result?.game_id || summaryGameId || activeGameId).toUpperCase();
                    const statusText =
                      result?.status === "processing" || result?.status === "pending"
                        ? "قيد المعالجة ⏳"
                        : "تم الشحن بنجاح ✅";
                    const totalDia = cart.reduce(
                      (s, c) => s + (Number(c.package.diamonds || 0) + Number(c.package.bonusDiamonds || 0)) * c.qty,
                      0,
                    );
                    const pkgSummary =
                      cart.map((c) => `${c.qty > 1 ? `${c.qty}x ` : ""}${c.package.name}`).join(" + ") || "باقة شحن";
                    const pkgWithDia = totalDia > 0 ? `${pkgSummary} (${totalDia} جوهرة 💎)` : pkgSummary;
                    const receiptPlayer = (verifiedPlayerName || player.name)
                      ? `${verifiedPlayerName || player.name} (${player.id})`
                      : player.id;
                    const receiptText = `🧾 إيصال شحن METO STORE\nرقم الطلب: ${result?.order_ref || "—"}\nاللاعب: ${receiptPlayer}\nاللعبة: ${finalGame}\nالباقة المشحونة: ${pkgWithDia}\nالإجمالي: ${finalPaidStr}\nالحالة: ${statusText}\nhttps://meto-three.vercel.app`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, "_blank");
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة الإيصال عبر واتساب</span>
                </Button>
                <Button className={`sm:w-28 rounded-xl ${outlineBtn}`} onClick={onClose}>
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Failed State */}
        {step === "failed" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border bg-rose-500/20 border-rose-500/40 text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="font-extrabold text-xl text-white">تعذر تنفيذ الشحن ❌</div>
              <div className="text-xs sm:text-sm text-rose-300 mt-1 max-w-md mx-auto">
                {result?.error || result?.message || "حدث خطأ أثناء معالجة الشحن، يرجى التحقق من صحة المعرف والسيرفر."}
              </div>
            </div>
            {isMerchant && !result?.isNetworkTimeout && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 max-w-md mx-auto">
                ✓ لم يتم خصم أي رصيد من محفظتك / تم الاسترداد التلقائي الفوري بالكامل.
              </div>
            )}
            {isMerchant && result?.isNetworkTimeout && (
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 max-w-md mx-auto">
                ⚠️ يرجى التحقق من سجل طلباتك ورصيد المحفظة قبل تكرار المحاولة لتجنب الشحن المزدوج.
              </div>
            )}
            <div className="flex gap-2 max-w-sm mx-auto pt-2">
              <Button className={`flex-1 ${outlineBtn}`} onClick={onClose}>
                إغلاق
              </Button>
              <Button className={`flex-1 font-bold ${primaryBtn}`} onClick={() => setStep("form")}>
                تعديل البيانات وإعادة المحاولة
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
