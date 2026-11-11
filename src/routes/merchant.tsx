import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import CheckoutModal from "../components/CheckoutModal";
import { useStore, supabase } from "../lib/store/useStore";
import { getStoreApi, getMerchantDashboardApi } from "../lib/api-client";
import type { CartItem, TopUpPackage } from "../types/store";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "../hooks/use-toast";
import { Wallet, Package, CheckCircle2, AlertTriangle, LogIn, LogOut, ShoppingCart, Plus } from "lucide-react";

export const Route = createFileRoute("/merchant")({ component: MerchantPage });

function MerchantPage() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [dash, setDash] = useState<any>(null);
  const [selectedGameId, setSelectedGameId] = useState("mlbb");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try { const d = await getStoreApi(); if (d?.packages) store.setPackages(d.packages); if (d?.settings) store.setSettings(d.settings); } catch {}
    })();
  }, []);

  const loadDashboard = async (token: string) => {
    const d = await getMerchantDashboardApi(token);
    if (d?.error) throw new Error(d.error);
    setDash(d);
    store.setAuth(token, d.profile, d.merchant);
  };

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        try { await loadDashboard(token); } catch {}
      }
    })();
  }, []);

  const signIn = async () => {
    if (!supabase) { toast({ title: "Supabase غير مهيأ" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error("لم يتم إنشاء جلسة");
      await loadDashboard(token);
      toast({ title: "تم تسجيل الدخول" });
    } catch (e: any) {
      toast({ title: "فشل تسجيل الدخول", description: e?.message || "تحقق من البيانات" });
    } finally { setLoading(false); }
  };

  const signOut = async () => {
    try { await supabase?.auth.signOut(); } catch {}
    store.setAuth(null, null, null);
    setDash(null);
    store.clearCart();
  };

  const authed = !!store.accessToken && !!store.merchant;
  const pkgs = useMemo(() => store.packages.filter((p) => p.active && (p.gameId === selectedGameId || (selectedGameId === "mlbb" && (!p.gameId || p.gameId === "mlbb")))), [store.packages, selectedGameId]);
  const cartCount = store.cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal = store.cart.reduce((s,i)=>s+i.qty*i.package.merchantBasePriceEgp,0);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full flex-1 py-6 space-y-6 pb-28">
        <div className="rounded-2xl border border-purple-500/30 bg-[#0d1022] p-5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">بوابة التاجر (B2B)</h1>
          <p className="text-xs text-slate-300 mt-1">تسجيل دخول آمن، محفظة بخصم ذري، وتنفيذ طلبات عبر Fazer. الرصيد والحركات تُدار على السيرفر فقط.</p>
        </div>

        {!authed ? (
          <div className="max-w-md rounded-2xl border border-slate-800 bg-[#0a0f20] p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2"><LogIn className="w-4 h-4 text-purple-400"/> تسجيل دخول التاجر</h2>
            <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <Button className="w-full" onClick={signIn} disabled={loading || !email || !password}>{loading?"جارٍ الدخول...":"دخول"}</Button>
            <p className="text-[11px] text-slate-400">إذا لم يكن حسابك مفعّلًا كتاجر، تواصل مع الأدمن لتفعيل `merchant_accounts`.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0a0f20] p-4">
              <div className="min-w-0">
                <div className="font-bold truncate">{store.profile?.full_name || store.profile?.phone || store.merchant?.user_id}</div>
                <div className="text-xs text-slate-400">هامش التاجر: <b className="text-purple-300">{dash?.stats?.margin_percent ?? store.merchant?.margin_percent ?? 0}%</b></div>
              </div>
              <Button variant="outline" onClick={signOut}><LogOut className="w-4 h-4"/> خروج</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800 bg-[#0a0f20] p-4"><div className="text-xs text-slate-400 flex items-center gap-1"><Wallet className="w-3.5 h-3.5"/> الرصيد</div><div className="text-lg font-extrabold text-emerald-300">{dash?.stats?.balance_egp ?? 0} ج.م</div></div>
              <div className="rounded-xl border border-slate-800 bg-[#0a0f20] p-4"><div className="text-xs text-slate-400">طلبات اليوم</div><div className="text-lg font-extrabold">{dash?.stats?.orders_today ?? 0}</div></div>
              <div className="rounded-xl border border-slate-800 bg-[#0a0f20] p-4"><div className="text-xs text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> تم تسليمها اليوم</div><div className="text-lg font-extrabold text-cyan-300">{dash?.stats?.delivered_today ?? 0}</div></div>
              <div className="rounded-xl border border-slate-800 bg-[#0a0f20] p-4"><div className="text-xs text-slate-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> غير مكتملة</div><div className="text-lg font-extrabold text-amber-300">{dash?.stats?.incomplete_orders ?? 0}</div></div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-bold flex items-center gap-2"><Package className="w-4 h-4 text-purple-400"/> باقات الشحن (سعر التاجر بعد الخصم)</h2>
                <select value={selectedGameId} onChange={(e)=>setSelectedGameId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs">
                  <option value="mlbb">Mobile Legends</option><option value="pubg">PUBG</option><option value="freefire">Free Fire</option><option value="hok">Honor of Kings</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pkgs.slice(0,60).map((p)=> (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                    <div className="min-w-0"><div className="text-sm font-semibold truncate">{p.name}</div><div className="text-xs text-slate-400">تكلفة تقريبية: {p.costUsd || 0}$</div></div>
                    <div className="flex items-center gap-2 shrink-0"><div className="text-sm font-bold text-purple-300">{p.merchantBasePriceEgp} ج.م</div><Button size="sm" className="h-8" onClick={()=>store.addToCart(p)}><Plus className="w-4 h-4"/></Button></div>
                  </div>
                ))}
                {pkgs.length===0 && <div className="text-xs text-slate-400">لا توجد باقات متزامنة لهذه اللعبة.</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4">
                <h3 className="font-bold mb-2">آخر الطلبات</h3>
                <div className="space-y-2 max-h-80 overflow-auto text-xs">
                  {(dash?.orders||[]).slice(0,30).map((o:any)=> (
                    <div key={o.id} className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
                      <div className="min-w-0"><div className="font-mono text-cyan-300">{o.order_ref}</div><div className="text-slate-400 truncate">{o.player_id} • {o.game_id} • {o.total_egp} ج.م</div></div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status==='success'?'bg-emerald-500/20 text-emerald-300':o.status==='failed'?'bg-rose-500/20 text-rose-300':'bg-amber-500/20 text-amber-300'}`}>{o.status}</span>
                    </div>
                  ))}
                  {(!dash?.orders||dash.orders.length===0) && <div className="text-slate-400">لا توجد طلبات بعد.</div>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4">
                <h3 className="font-bold mb-2">حركات المحفظة (Ledger)</h3>
                <div className="space-y-2 max-h-80 overflow-auto text-xs">
                  {(dash?.transactions||[]).slice(0,30).map((t:any)=> (
                    <div key={t.id} className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
                      <div className="min-w-0"><div className="font-semibold">{t.entry_type}</div><div className="text-slate-400 truncate">{t.note || t.reference_id || '-'}</div></div>
                      <div className={`font-mono font-bold ${Number(t.amount)>=0?'text-emerald-300':'text-rose-300'}`}>{Number(t.amount)>=0?'+':''}{t.amount} <span className="text-slate-400 font-normal">({t.balance_after})</span></div>
                    </div>
                  ))}
                  {(!dash?.transactions||dash.transactions.length===0) && <div className="text-slate-400">لا توجد حركات بعد.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {authed && store.cart.length>0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-purple-500/40 bg-[#0d1022]/95 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-purple-300"/></div><div><div className="font-bold text-sm">{cartCount} عنصر</div><div className="text-xs text-slate-300">إجمالي الخصم من المحفظة: <span className="text-purple-300 font-bold">{cartTotal} ج.م</span></div></div></div>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>store.clearCart()}>تفريغ</Button><Button onClick={()=>setCheckoutOpen(true)}>تنفيذ الآن</Button></div>
          </div>
        </div>
      )}

      <Footer />
      <CheckoutModal open={checkoutOpen} onClose={()=>setCheckoutOpen(false)} cart={store.cart} onUpdateQty={store.updateCartQty} onRemove={store.removeFromCart} onClear={store.clearCart} />
    </div>
  );
}
