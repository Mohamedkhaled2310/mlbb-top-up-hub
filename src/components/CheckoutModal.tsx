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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={step !== "processing" ? onClose : undefined} />
      <div className="relative w-full max-w-xl glass-card rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} disabled={step === "processing"} className="absolute top-4 end-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>

        {step === "form" && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold flex items-center gap-2"><User className="w-5 h-5 text-primary"/> بيانات الشحن</h3>
            <div>
              <label className="text-sm text-muted-foreground">معرف اللاعب (Player ID) *</label>
              <Input value={player.id} onChange={(e) => setPlayer({ ...player, id: e.target.value })} placeholder="مثال: 12345678" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">معرف السيرفر/المنطقة داخل اللعبة (Zone ID) إن وجد</label>
              <Input value={player.zoneId || ""} onChange={(e) => setPlayer({ ...player, zoneId: e.target.value })} placeholder="مثال: 1234" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">منطقة الحساب (Region) *</label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="مثال: EG / MENA / Global (حسب اللعبة)" />
              <p className="text-xs text-muted-foreground mt-1">يجب أن تطابق منطقة الحساب الحقيقية لتجنب فشل الشحن.</p>
            </div>

            <div className="border border-border rounded-xl p-3 space-y-2">
              <div className="font-semibold flex items-center gap-2"><Package className="w-4 h-4"/> السلة ({cart.length})</div>
              {cart.length === 0 && <p className="text-sm text-muted-foreground">السلة فارغة. اختر باقات من القائمة.</p>}
              {cart.map((it) => {
                const unit = isMerchant ? it.package.merchantBasePriceEgp : it.package.retailPriceEgp;
                return (
                  <div key={it.package.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.package.name}</div>
                      <div className="text-muted-foreground">{unit} ج.م ×</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => onUpdateQty(it.package.id, Math.max(1, it.qty - 1))}>-</Button>
                      <span className="w-6 text-center">{it.qty}</span>
                      <Button size="sm" variant="outline" onClick={() => onUpdateQty(it.package.id, it.qty + 1)}>+</Button>
                      <Button size="sm" variant="ghost" onClick={() => onRemove(it.package.id)}><X className="w-4 h-4"/></Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-border font-bold"><span>الإجمالي</span><span className="text-primary">{total} ج.م</span></div>
            </div>

            <Button className="w-full" onClick={validate} disabled={isValidating || !cart.length || !player.id || !region}>
              {isValidating ? <><Loader2 className="w-4 h-4 animate-spin"/> جاري التحقق...</> : "تحقق ومتابعة"}
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary"/> مراجعة الطلب</h3>
            <div className="text-sm space-y-1 bg-muted/30 rounded-lg p-3">
              <div><span className="text-muted-foreground">اللاعب:</span> <b>{player.name || player.id}</b> ({player.id}{player.zoneId ? ` / ${player.zoneId}` : ""})</div>
              <div><span className="text-muted-foreground">المنطقة:</span> <b>{region}</b></div>
            </div>
            <div className="space-y-1 text-sm">
              {cart.map((it) => {
                const unit = isMerchant ? it.package.merchantBasePriceEgp : it.package.retailPriceEgp;
                return <div key={it.package.id} className="flex justify-between"><span>{it.package.name} × {it.qty}</span><span>{unit * it.qty} ج.م</span></div>;
              })}
              <div className="flex justify-between font-bold pt-2 border-t border-border"><span>الإجمالي</span><span className="text-primary">{total} ج.م</span></div>
            </div>
            {!isMerchant && (
              <div className="flex gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg"><AlertTriangle className="w-4 h-4 shrink-0"/> سيتم تنفيذ الشحن بعد تأكيد الدفع. (وسيلة الدفع البديلة ستُفعّل قريبًا؛ يمكنك التواصل معنا لتأكيد الدفع يدويًا الآن.)</div>
            )}
            {isMerchant && (
              <div className="flex gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg"><AlertTriangle className="w-4 h-4 shrink-0"/> كتاجر: سيتم خصم الإجمالي من رصيد محفظتك ذريًا قبل التنفيذ (لا يمكن تجاوزه عند عدم كفاية الرصيد).</div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>رجوع</Button>
              <Button className="flex-1" onClick={submit}>تأكيد وإرسال الطلب</Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary"/>
            <div className="font-semibold">جاري معالجة الطلب...</div>
            <div className="text-sm text-muted-foreground">يتم التحقق والخصم/التنفيذ بشكل آمن على الخادم.</div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500"/>
            <div className="font-bold text-lg">تم استلام/تنفيذ الطلب</div>
            <div className="text-sm text-muted-foreground">{result?.message || "تمت العملية بنجاح."}</div>
            {result?.order_ref && <div className="text-xs font-mono bg-muted p-2 rounded">رقم الطلب: {result.order_ref}</div>}
            <Button className="mt-2" onClick={onClose}>إغلاق</Button>
          </div>
        )}

        {step === "failed" && (
          <div className="py-8 text-center space-y-3">
            <XCircle className="w-12 h-12 mx-auto text-destructive"/>
            <div className="font-bold text-lg">تعذر إتمام الطلب</div>
            <div className="text-sm text-muted-foreground">{result?.error || "حدث خطأ غير متوقع."}</div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setStep("form")}>تعديل</Button>
              <Button onClick={onClose}>إغلاق</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
