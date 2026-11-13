import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, MapPin, MessageCircle, Package, Share2, User, X, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcMerchantUnitPriceEgp } from "@/lib/pricing";
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
  const { player, setPlayer, isMerchant, accessToken, merchant, settings, profile, setAuth } = useStore();
  const [step, setStep] = useState<CheckoutStep>("form");
  const [region, setRegion] = useState(player.region || "");
  const [regionLocked, setRegionLocked] = useState(false);
  const [needsManualRegion, setNeedsManualRegion] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const submitted = useRef(false);
  const latestRegionRef = useRef(player.region || "");
  latestRegionRef.current = player.region || "";

  useEffect(() => {
    if (open) {
      setStep("form");
      setResult(null);
      setRegion(latestRegionRef.current);
      setRegionLocked(Boolean(latestRegionRef.current));
      setNeedsManualRegion(false);
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

  const total = cart.reduce((sum, item) => sum + item.qty * getItemUnitPrice(item), 0);

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
        const accRegion = res.accountRegion || "";
        const finalRegion = accRegion || region.trim() || "global";
        if (accRegion) {
          setRegionLocked(true);
          setNeedsManualRegion(false);
        } else if (!region.trim()) {
          setNeedsManualRegion(true);
        }
        setPlayer({ ...player, name: res.username || player.name, region: finalRegion });
        setRegion(finalRegion);
        saveRecentAccount({
          id: player.id.trim(),
          zoneId: player.zoneId?.trim(),
          name: res.username || undefined,
          region: finalRegion,
          gameId: activeGameId,
        });
        setStep("review");
      } else {
        if (res.error && (res.error.includes("منطقة") || res.error.includes("region"))) {
          setNeedsManualRegion(true);
        }
        toast({ title: "فشل التحقق", description: res.error || "تعذر التحقق من اللاعب/المنطقة" });
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
    setStep("processing");
    try {
      const body = {
        playerId: player.id.trim(),
        zoneId: (player.zoneId || "").trim(),
        gameId: activeGameId,
        region: region.trim() || "global",
        items: cart.map((c) => ({ offerId: c.package.offerId, qty: c.qty })),
        asMerchant: isMerchant,
      };
      const res = await submitOrderApi(body, accessToken);
      setResult(res);
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

            {regionLocked && region ? (
              <div>
                <label className="text-xs sm:text-sm text-slate-300">منطقة الحساب (Region)</label>
                <div className="mt-1 w-full rounded-xl border border-emerald-600/40 bg-emerald-950/20 px-4 py-2.5 text-sm text-emerald-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{region}</span>
                  <span className="text-[11px] text-emerald-400/80">(تم التحديد تلقائياً)</span>
                </div>
              </div>
            ) : needsManualRegion ? (
              <div>
                <label className="text-xs sm:text-sm text-amber-200">منطقة الحساب (Region)</label>
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="أدخل المنطقة (مثال: Global أو MENA أو ID)"
                  className="mt-1 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
                <p className="text-[11px] text-amber-300/90 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" /> لم ترجع المنطقة من السيرفر، يرجى كتابتها للمتابعة.
                </p>
              </div>
            ) : null}

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
                return (
                  <div
                    key={it.package.id}
                    className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-800/80 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{it.package.name}</div>
                      <div className="text-slate-400 text-xs">{unit} ج.م × {it.qty}</div>
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
                <span className="text-rose-400 font-mono">{total} ج.م</span>
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
            <div className="text-sm space-y-1.5 bg-slate-900/70 border border-slate-700 rounded-xl p-3.5">
              <div>
                <span className="text-slate-400">اللاعب:</span> <b>{player.name || player.id}</b> (
                <span className="font-mono" dir="ltr">
                  {player.id}
                  {needsZone && player.zoneId ? ` / ${player.zoneId}` : ""}
                </span>
                )
              </div>
              <div>
                <span className="text-slate-400">اللعبة:</span> <b className="uppercase">{activeGameId}</b>
              </div>
              <div>
                <span className="text-slate-400">المنطقة:</span> <b>{region}</b>
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
                    <span className="shrink-0 font-mono">{unit * it.qty} ج.م</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-bold pt-2 border-t border-slate-700">
                <span>الإجمالي</span>
                <span className="text-rose-400 font-mono">{total} ج.م</span>
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
                  كتاجر: سيتم خصم <b>{total} ج.م</b> من محفظتك ذرياً مع استرداد تلقائي إذا تعذر التنفيذ لدى المزود.
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
                <span className="font-semibold text-slate-200">{activeGameId.toUpperCase()} • {region || "Global"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">المبلغ الإجمالي:</span>
                <span className="font-bold text-base text-rose-400 font-mono">{total} ج.م</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 flex items-center justify-center gap-2"
                onClick={() => {
                  const receiptText = `🧾 إيصال شحن METO STORE\nرقم الطلب: ${result?.order_ref || "—"}\nاللاعب: ${player.name || player.id} (${player.id})\nاللعبة: ${activeGameId.toUpperCase()}\nالإجمالي: ${total} ج.م\nالحالة: تم الشحن بنجاح ✅\nhttps://meto-three.vercel.app`;
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
