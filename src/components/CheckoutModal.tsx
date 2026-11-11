import { useState, useEffect, useRef } from "react";
import { X, Loader2, CheckCircle2, XCircle, User, Package, CreditCard, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "../hooks/use-toast";
import { validatePlayerApi, submitOrderApi } from "@/lib/api-client";
import type { CartItem } from "@/types/store";

type CheckoutStep = "form" | "review" | "processing" | "success" | "failed";

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (packageId: string, qty: number) => void;
  onRemove: (packageId: string) => void;
  onClear: () => void;
}

export default function CheckoutModal({ open, onClose, cart, onUpdateQty, onRemove, onClear }: Props) {
  const { player, setPlayer, isMerchant, accessToken } = useStore();
  const [step, setStep] = useState<CheckoutStep>("form");
  const [region, setRegion] = useState(player.region || "");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (open) { setStep("form"); setResult(null); submitted.current = false; }
  }, [open]);

  if (!open) return null;

  const total = cart.reduce((s, i) => s + i.qty * (isMerchant ? i.package.merchantBasePriceEgp : i.package.retailPriceEgp), 0);

  const validate = async () => {
    if (!player.id || !region) { toast({ title: "بيانات ناقصة", description: "أدخل معرف اللاعب والمنطقة" }); return; }
    if (!cart.length) { toast({ title: "السلة فارغة", description: "اختر باقة واحدة على الأقل" }); return; }
    setIsValidating(true);
    try {
      const res = await validatePlayerApi(player.id, player.zoneId, cart[0]?.package.gameId || "mlbb", region);
      if (res.valid) {
        setPlayer({ ...player, name: res.username || player.name, region: (res as any).accountRegion || region });
        setRegion((res as any).accountRegion || region);
        setStep("review");
      } else {
        toast({ title: "فشل التحقق", description: res.error || "تعذر التحقق من اللاعب/المنطقة" });
      }
    } catch {
      toast({ title: "خطأ", description: "تعذر الاتصال بالخادم" });
    } finally { setIsValidating(false); }
  };

  const submit = async () => {
    if (submitted.current) return;
    submitted.current = true;
    setStep("processing");
    try {
      const body = {
        playerId: player.id,
        zoneId: player.zoneId || "",
        gameId: cart[0]?.package.gameId || "mlbb",
        region,
        items: cart.map((c) => ({ offerId: c.package.offerId, qty: c.qty })),
        asMerchant: isMerchant,
      };
      const res = await submitOrderApi(body, accessToken);
      setResult(res);
      if (res.success) {
        setStep("success");
        onClear();
      } else {
        setStep("failed");
      }
    } catch (e: any) {
      setResult({ error: e?.message || "حدث خطأ" });
      setStep("failed");
    } finally {
      submitted.current = false;
    }
  };

  const outlineBtn = "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white";
  const primaryBtn = "bg-rose-600 hover:bg-rose-500 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step !== "processing" ? onClose : undefined} />
      <div className="relative w-full sm:max-w-xl bg-[#0b1020] border border-slate-700/80 text-slate-100 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
        <button onClick={onClose} disabled={step === "processing"} className="absolute top-3 end-3 sm:top-4 sm:end-4 h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"><X className="w-4 h-4" /></button>

        {step === "form" && (
          <div className="space-y-4 pt-2 sm:pt-0">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><User className="w-5 h-5 text-rose-400"/> بيانات الشحن</h3>
            <div>
              <label className="text-xs sm:text-sm text-slate-300">معرف اللاعب (Player ID) *</label>
              <Input value={player.id} onChange={(e) => setPlayer({ ...player, id: e.target.value })} placeholder="مثال: 12345678" className="mt-1 bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500" />
            </div>
            <div>
              <label className="text-xs sm:text-sm text-slate-300">معرف السيرفر/المنطقة داخل اللعبة (Zone ID) إن وجد</label>
              <Input value={player.zoneId || ""} onChange={(e) => setPlayer({ ...player, zoneId: e.target.value })} placeholder="مثال: 1234" className="mt-1 bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500" />
            </div>
            <div>
              <label className="text-xs sm:text-sm text-slate-300">منطقة الحساب (Region) *</label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="مثال: EG / MENA / Global (حسب اللعبة)" className="mt-1 bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500" />
              <p className="text-[11px] text-slate-400 mt-1">يجب أن تطابق منطقة الحساب الحقيقية لتجنب فشل الشحن.</p>
            </div>

            <div className="border border-slate-700 rounded-xl p-3 space-y-2 bg-slate-900/40">
              <div className="font-semibold flex items-center gap-2 text-sm"><Package className="w-4 h-4 text-cyan-400"/> السلة ({cart.length})</div>
              {cart.length === 0 && <p className="text-sm text-slate-400">السلة فارغة. اختر باقات من القائمة.</p>}
              {cart.map((it) => {
                const unit = isMerchant ? it.package.merchantBasePriceEgp : it.package.retailPriceEgp;
                return (
                  <div key={it.package.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-slate-800/80 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{it.package.name}</div>
                      <div className="text-slate-400 text-xs">{unit} ج.م ×</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className={outlineBtn + " h-8 w-8 p-0"} onClick={() => onUpdateQty(it.package.id, Math.max(1, it.qty - 1))}>-</Button>
                      <span className="w-6 text-center font-semibold">{it.qty}</span>
                      <Button size="sm" variant="outline" className={outlineBtn + " h-8 w-8 p-0"} onClick={() => onUpdateQty(it.package.id, it.qty + 1)}>+</Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-rose-800 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white" onClick={() => onRemove(it.package.id)}><X className="w-4 h-4"/></Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-slate-700 font-bold"><span>الإجمالي</span><span className="text-rose-400">{total} ج.م</span></div>
            </div>

            <Button className={`w-full h-11 ${primaryBtn}`} onClick={validate} disabled={isValidating || !cart.length || !player.id || !region}>
              {isValidating ? <><Loader2 className="w-4 h-4 animate-spin"/> جاري التحقق...</> : "تحقق ومتابعة"}
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 pt-2 sm:pt-0">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-rose-400"/> مراجعة الطلب</h3>
            <div className="text-sm space-y-1 bg-slate-900/60 border border-slate-700 rounded-lg p-3">
              <div><span className="text-slate-400">اللاعب:</span> <b>{player.name || player.id}</b> ({player.id}{player.zoneId ? ` / ${player.zoneId}` : ""})</div>
              <div><span className="text-slate-400">المنطقة:</span> <b>{region}</b></div>
            </div>
            <div className="space-y-1 text-sm">
              {cart.map((it) => {
                const unit = isMerchant ? it.package.merchantBasePriceEgp : it.package.retailPriceEgp;
                return <div key={it.package.id} className="flex justify-between gap-2"><span className="truncate">{it.package.name} × {it.qty}</span><span className="shrink-0">{unit * it.qty} ج.م</span></div>;
              })}
              <div className="flex justify-between font-bold pt-2 border-t border-slate-700"><span>الإجمالي</span><span className="text-rose-400">{total} ج.م</span></div>
            </div>
            {!isMerchant && (
              <div className="flex gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/50 p-3 rounded-lg"><AlertTriangle className="w-4 h-4 shrink-0"/> سيتم تنفيذ الشحن بعد تأكيد الدفع. (وسيلة الدفع البديلة ستُفعّل قريبًا؛ يمكنك التواصل معنا لتأكيد الدفع يدويًا الآن.)</div>
            )}
            {isMerchant && (
              <div className="flex gap-2 text-xs text-blue-300 bg-blue-950/30 border border-blue-800/50 p-3 rounded-lg"><AlertTriangle className="w-4 h-4 shrink-0"/> كتاجر: سيتم خصم الإجمالي من رصيد محفظتك ذريًا قبل التنفيذ (لا يمكن تجاوزه عند عدم كفاية الرصيد).</div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className={`flex-1 ${outlineBtn}`} onClick={() => setStep("form")}>رجوع</Button>
              <Button className={`flex-1 ${primaryBtn}`} onClick={submit}>تأكيد وإرسال الطلب</Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-rose-400"/>
            <div className="font-semibold">جاري معالجة الطلب...</div>
            <div className="text-sm text-slate-400">يتم التحقق والخصم/التنفيذ بشكل آمن على الخادم.</div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500"/>
            <div className="font-bold text-lg">تم استلام/تنفيذ الطلب</div>
            <div className="text-sm text-slate-300">{result?.message || "تمت العملية بنجاح."}</div>
            {result?.order_ref && <div className="text-xs font-mono bg-slate-900 border border-slate-700 p-2 rounded">{result.order_ref}</div>}
            <Button className={`mt-2 ${primaryBtn}`} onClick={onClose}>إغلاق</Button>
          </div>
        )}

        {step === "failed" && (
          <div className="py-8 text-center space-y-3">
            <XCircle className="w-12 h-12 mx-auto text-rose-500"/>
            <div className="font-bold text-lg">تعذر إتمام الطلب</div>
            <div className="text-sm text-slate-300">{result?.error || "حدث خطأ غير متوقع."}</div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center">
              <Button variant="outline" className={outlineBtn} onClick={() => setStep("form")}>تعديل</Button>
              <Button className={primaryBtn} onClick={onClose}>إغلاق</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
