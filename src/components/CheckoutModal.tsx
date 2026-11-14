import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Globe, Loader2, MessageCircle, Package, Share2, User, UserCheck, X, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcMerchantUnitPriceEgp, formatDecimals3, round3 } from "@/lib/pricing";
import { getServerLabel } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "../hooks/use-toast";
import { submitOrderApi, validatePlayerApi } from "@/lib/api-client";
import { CopyButton } from "./CopyButton";
import { saveRecentAccount } from "../lib/recent-players";
import type { CartItem } from "@/types/store";

type CheckoutStep = "form" | "review" | "processing" | "success" | "failed";

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
  const { player, setPlayer, isMerchant, accessToken, merchant, settings, profile, setAuth, packages, setCart } = useStore();
  const [step, setStep] = useState<CheckoutStep>("form");
  const [region, setRegion] = useState(player.region || "");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [paidTotal, setPaidTotal] = useState<number>(0);
  const [summaryGameId, setSummaryGameId] = useState<string>("mlbb");
  const [summaryRegion, setSummaryRegion] = useState<string>("global");
  const submitted = useRef(false);
  const latestRegionRef = useRef(player.region || "");
  latestRegionRef.current = player.region || "";

  useEffect(() => {
    if (open) {
      setStep("form");
      setResult(null);
      setPaidTotal(0);
      const pkgServer = (Array.isArray(cart[0]?.package.regions) && cart[0]?.package.regions[0]) || latestRegionRef.current || player.region || "global";
      const initialRegion = pkgServer.toLowerCase();
      setRegion(initialRegion);
      submitted.current = false;
    }
  }, [open]);

  if (!open) return null;

  const activeGameId = cart[0]?.package.gameId || "mlbb";
  const needsZone = activeGameId === "mlbb";
  const merchantMargin = Number(merchant?.margin_percent || 0);

  const getItemUnitPrice = (item: CartItem): number => {
    if (isMerchant) {
      const base = item.package.merchantBasePriceEgp ?? item.package.retailPriceEgp;
      return calcMerchantUnitPriceEgp(base, merchantMargin, item.package.costUsd, settings.egp_rate);
    }
    return item.package.retailPriceEgp;
  };

  const total = round3(cart.reduce((sum, item) => sum + item.qty * getItemUnitPrice(item), 0));

  const validate = async () => {
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
    setIsValidating(true);
    try {
      const res = await validatePlayerApi(
        player.id.trim(),
        player.zoneId?.trim(),
        activeGameId,
        region.trim() || undefined,
        cart[0]?.package.fazerCategoryId,
      );
      if (res.valid) {
        const playerName = res.username || player.name || player.id.trim();
        const finalRegion = region.trim() || res.accountRegion || "global";
        setPlayer({ ...player, name: playerName, region: finalRegion });
        setRegion(finalRegion);
        saveRecentAccount({
          id: player.id.trim(),
          zoneId: player.zoneId?.trim(),
          name: playerName,
          region: finalRegion,
          gameId: activeGameId,
        });
        setStep("review");
      } else {
        toast({ title: "فشل التحقق", description: res.error || "تعذر التحقق من معرف اللاعب" });
      }
    } catch {
      toast({ title: "خطأ", description: "تعذر الاتصال بالخادم" });
    } finally {
      setIsValidating(false);
    }
  };

  const submit = async () => {
    if (submitted.current) return;
    submitted.current = true;
    const currentTotal = total;
    const currentGame = activeGameId;
    const currentRegion = region.trim() || "global";
    setPaidTotal(currentTotal);
    setSummaryGameId(currentGame);
    setSummaryRegion(currentRegion);
    setStep("processing");
    try {
      const body = {
        playerId: player.id.trim(),
        zoneId: (player.zoneId || "").trim(),
        gameId: currentGame,
        region: currentRegion,
        items: cart.map((c) => ({ offerId: c.package.offerId, qty: c.qty })),
        asMerchant: isMerchant,
      };
      const res = await submitOrderApi(body, accessToken);
      setResult(res);
      if (typeof res?.total_egp === "number" && res.total_egp > 0) {
        setPaidTotal(res.total_egp);
      }
      if (typeof res?.balance_egp === "number" && accessToken && merchant) {
        setAuth(accessToken, profile, { ...merchant, balance_egp: res.balance_egp });
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
      setResult({ error: e?.message || "حدث خطأ غير متوقع" });
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
        <button
          onClick={onClose}
          disabled={step === "processing"}
          aria-label="إغلاق"
          className="absolute top-3 end-3 sm:top-4 sm:end-4 h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "form" && (
          <div className="space-y-4 pt-2 sm:pt-0">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-rose-400" />
              <span>بيانات الشحن</span>
              <span className="text-[11px] rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-cyan-300 font-mono uppercase">
                {activeGameId}
              </span>
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-slate-300">معرف اللاعب (Player ID) *</label>
              <Input
                value={player.id}
                onChange={(e) => setPlayer({ ...player, id: e.target.value })}
                placeholder="مثال: 12345678"
                className="mt-1 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 font-mono"
              />
            </div>

            {needsZone && (
              <div>
                <label className="text-xs sm:text-sm text-slate-300">معرف السيرفر (Zone ID) *</label>
                <Input
                  value={player.zoneId || ""}
                  onChange={(e) => setPlayer({ ...player, zoneId: e.target.value })}
                  placeholder="مثال: 2024"
                  className="mt-1 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 font-mono"
                />
              </div>
            )}

            {/* Selected Server Badge (Determined outside by package selection) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/80 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>سيرفر الشحن المحدد للباقة:</span>
              </span>
              <span className="font-bold text-purple-300 bg-purple-950/70 border border-purple-500/30 px-2.5 py-0.5 rounded-md text-[11px]">
                {getServerLabel(region || "global", activeGameId)}
              </span>
            </div>

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
                const unit = getItemUnitPrice(it);
                const pkgServer = (Array.isArray(it.package.regions) && it.package.regions[0]) || "global";
                return (
                  <div
                    key={it.package.id}
                    className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-800/80 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{it.package.name}</div>
                      <div className="text-slate-400 text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{unit} ج.م × {it.qty}</span>
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
              <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
                <span>الإجمالي</span>
                <span className="text-rose-400 font-mono">{formatDecimals3(total)} ج.م</span>
              </div>
            </div>

            <Button
              className={`w-full h-11 font-bold ${primaryBtn}`}
              onClick={validate}
              disabled={isValidating || !cart.length || !player.id.trim()}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> جاري التحقق...
                </>
              ) : (
                "تحقق ومتابعة"
              )}
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 pt-2 sm:pt-0">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-rose-400" /> مراجعة الطلب
            </h3>
            {/* Player Verified Nickname Banner */}
            <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 via-emerald-900/25 to-slate-900/80 p-3.5 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400 font-medium">اسم اللاعب (Nickname)</div>
                  <div className="font-extrabold text-emerald-300 text-base sm:text-lg truncate">
                    {player.name || player.id}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> تم التحقق
              </span>
            </div>

            {/* Account Information Card */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/70 border border-slate-700/80 rounded-xl p-3">
              <div className="bg-[#080d1e] border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block mb-0.5">معرف اللاعب (Player ID)</span>
                <span className="font-mono font-bold text-white text-xs sm:text-sm">{player.id}</span>
              </div>
              {needsZone && (
                <div className="bg-[#080d1e] border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block mb-0.5">معرف السيرفر (Zone ID)</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs sm:text-sm">{player.zoneId}</span>
                </div>
              )}
              <div className="bg-[#080d1e] border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block mb-0.5">اللعبة</span>
                <span className="font-bold text-slate-200 uppercase">{activeGameId}</span>
              </div>
              <div className="bg-[#080d1e] border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block mb-0.5">سيرفر الشحن المعتمد</span>
                <span className="font-bold text-purple-300">{getServerLabel(region || "global", activeGameId)}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-sm bg-slate-900/40 rounded-xl border border-slate-800 p-3">
              {cart.map((it) => {
                const unit = getItemUnitPrice(it);
                return (
                  <div key={it.package.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {it.package.name} × {it.qty}
                    </span>
                    <span className="shrink-0 font-mono">{formatDecimals3(unit * it.qty)} ج.م</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-bold pt-2 border-t border-slate-700">
                <span>الإجمالي</span>
                <span className="text-rose-400 font-mono">{formatDecimals3(total)} ج.م</span>
              </div>
            </div>

            {!isMerchant ? (
              <div className="flex gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>سيتم تنفيذ الشحن مباشرة عبر FazerCards بمجرد تأكيد الدفع/الطلب.</span>
              </div>
            ) : (
              <div className="flex gap-2 text-xs text-blue-300 bg-blue-950/30 border border-blue-800/50 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  كتاجر: سيتم خصم <b>{formatDecimals3(total)} ج.م</b> من محفظتك ذرياً مع استرداد تلقائي إذا تعذر التنفيذ لدى المزود.
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className={`flex-1 ${outlineBtn}`} onClick={() => setStep("form")}>
                رجوع
              </Button>
              <Button className={`flex-1 font-bold ${primaryBtn}`} onClick={submit}>
                تأكيد وإرسال الطلب
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-rose-400" />
            <div className="font-semibold">جاري معالجة الطلب...</div>
            <div className="text-sm text-slate-400">يتم التحقق والخصم والتنفيذ بشكل آمن على الخادم.</div>
          </div>
        )}

        {step === "success" && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <div className="font-extrabold text-xl text-white">تم شحن الحساب بنجاح! 🎉</div>
              <div className="text-xs sm:text-sm text-emerald-300 mt-1">{result?.message || "تم تنفيذ الطلب وتسليم الباقات فورياً."}</div>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3.5 text-xs text-right space-y-2 font-sans">
              {result?.order_ref && (
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">رقم الطلب:</span>
                  <div className="flex items-center gap-1.5 font-mono text-emerald-300">
                    <span>{result.order_ref}</span>
                    <CopyButton text={result.order_ref} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">حساب اللاعب:</span>
                <div className="flex items-center gap-1.5 font-mono text-white">
                  <span>{player.name ? `${player.name} (${player.id})` : player.id}</span>
                  <CopyButton text={player.id} />
                </div>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">اللعبة والمنطقة:</span>
                <span className="font-semibold text-slate-200">
                  {(result?.game_id || summaryGameId || activeGameId).toUpperCase()} • {result?.region || summaryRegion || region || "Global"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">المبلغ الإجمالي:</span>
                <span className="font-bold text-base text-rose-400 font-mono">
                  {formatDecimals3(typeof result?.total_egp === "number" && result.total_egp > 0 ? result.total_egp : paidTotal || total)} ج.م
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 flex items-center justify-center gap-2"
                onClick={() => {
                  const finalPaid = formatDecimals3(typeof result?.total_egp === "number" && result.total_egp > 0 ? result.total_egp : paidTotal || total);
                  const finalGame = (result?.game_id || summaryGameId || activeGameId).toUpperCase();
                  const receiptText = `🧾 إيصال شحن METO STORE\nرقم الطلب: ${result?.order_ref || "—"}\nاللاعب: ${player.name || player.id} (${player.id})\nاللعبة: ${finalGame}\nالإجمالي: ${finalPaid} ج.م\nالحالة: تم الشحن بنجاح ✅\nhttps://meto-three.vercel.app`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, "_blank");
                }}
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة الإيصال عبر واتساب</span>
              </Button>
              <Button className={`sm:w-32 ${outlineBtn}`} onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        )}

        {step === "failed" && (
          <div className="py-8 text-center space-y-3">
            <XCircle className="w-12 h-12 mx-auto text-rose-500" />
            <div className="font-bold text-lg">تعذر إتمام الطلب</div>
            <div className="text-sm text-slate-300">{result?.error || result?.message || "حدث خطأ غير متوقع."}</div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center pt-2">
              <Button variant="outline" className={outlineBtn} onClick={() => setStep("form")}>
                تعديل
              </Button>
              <Button className={primaryBtn} onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
