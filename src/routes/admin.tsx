import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { useStore, supabase } from "../lib/store/useStore";
import { getStoreApi, adminListMerchantsApi, adminCreditMerchantApi, adminSetMarginApi, adminUpdateEgpRateApi, adminSyncFazerApi, checkSystemStatusApi } from "../lib/api-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "../hooks/use-toast";
import { RefreshCw, Server, DollarSign, Users, LogIn, LogOut, Shield } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [egpRate, setEgpRate] = useState<number>(store.settings.egp_rate || 50);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [mPage, setMPage] = useState(1);
  const [mTotalPages, setMTotalPages] = useState(1);
  const [mQuery, setMQuery] = useState("");
  const [credit, setCredit] = useState<{ id: string; amount: string; note: string } | null>(null);
  const [marginEdit, setMarginEdit] = useState<{ id: string; value: string } | null>(null);

  const loadStore = async () => {
    try { const d = await getStoreApi(); if (d?.packages) store.setPackages(d.packages); if (d?.settings) { store.setSettings(d.settings); setEgpRate(d.settings.egp_rate || 50); } } catch {}
  };

  const refreshStatus = async () => { try { setStatus(await checkSystemStatusApi()); } catch {} };

  const loadMerchants = async (token: string, page = 1, q = "") => {
    const d = await adminListMerchantsApi(token, { page, limit: 10, q });
    if (d?.error) throw new Error(d.error);
    setMerchants(d.merchants || []);
    setMPage(d.page || page);
    setMTotalPages(d.totalPages || 1);
  };

  useEffect(() => { loadStore(); refreshStatus(); }, []);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        // try loading merchants; will fail if not admin
        await loadMerchants(token, 1, "");
        store.setAuth(token, null, null);
        setIsAdmin(true);
      } catch { setIsAdmin(false); }
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
      await loadMerchants(token, 1, "");
      store.setAuth(token, null, null);
      setIsAdmin(true);
      toast({ title: "تم الدخول كأدمن" });
    } catch (e: any) {
      setIsAdmin(false);
      toast({ title: "فشل الدخول/غير مصرح", description: e?.message || "تأكد أن الحساب أدمن" });
    } finally { setLoading(false); }
  };

  const signOut = async () => { try { await supabase?.auth.signOut(); } catch {}; store.setAuth(null,null,null); setIsAdmin(false); setMerchants([]); };

  const token = store.accessToken;

  const doSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const r = await adminSyncFazerApi(token);
      if (!r?.ok) throw new Error(r?.error || "فشلت المزامنة");
      toast({ title: "تمت مزامنة Fazer", description: `باقات: ${r?.catalog?.count || 0} • رصيد: ${r?.account?.balance ?? "?"} ${r?.account?.currency ?? ""}` });
      await loadStore(); await refreshStatus();
    } catch (e: any) { toast({ title: "خطأ في المزامنة", description: e?.message }); }
    finally { setSyncing(false); }
  };

  const saveRate = async () => {
    if (!token) return;
    try {
      const r = await adminUpdateEgpRateApi(token, Number(egpRate));
      if (r?.error) throw new Error(r.error);
      toast({ title: "تم تحديث سعر الصرف", description: `${egpRate} ج.م/$` });
      await loadStore();
    } catch (e: any) { toast({ title: "تعذر الحفظ", description: e?.message }); }
  };

  const submitCredit = async () => {
    if (!token || !credit) return;
    try {
      const r = await adminCreditMerchantApi(token, { merchant_id: credit.id, amount: Number(credit.amount), note: credit.note || "شحن رصيد" });
      if (r?.error) throw new Error(r.error);
      toast({ title: "تمت إضافة الرصيد" });
      setCredit(null); await loadMerchants(token, mPage, mQuery);
    } catch (e: any) { toast({ title: "فشل", description: e?.message }); }
  };

  const submitMargin = async () => {
    if (!token || !marginEdit) return;
    try {
      const r = await adminSetMarginApi(token, { merchant_id: marginEdit.id, margin_percent: Number(marginEdit.value) });
      if (r?.error) throw new Error(r.error);
      toast({ title: "تم تحديث هامش التاجر" });
      setMarginEdit(null); await loadMerchants(token, mPage, mQuery);
    } catch (e: any) { toast({ title: "فشل", description: e?.message }); }
  };

  const groupedCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of store.packages) m[p.gameId] = (m[p.gameId] || 0) + 1;
    return m;
  }, [store.packages]);

  return (
    <div className="min-h-screen bg-[#070912] text-slate-100 flex flex-col">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full flex-1 py-6 space-y-6 pb-16">
        <div className="rounded-2xl border border-amber-500/30 bg-[#0d1222] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2"><Shield className="w-5 h-5 text-amber-400"/> لوحة الأدمن</h1><p className="text-xs text-slate-400 mt-1">مزامنة Fazer، سعر الصرف، وإدارة التجار (الدخول عبر حساب Supabase بدور admin).</p></div>
          {isAdmin && <Button variant="outline" onClick={signOut}><LogOut className="w-4 h-4"/> خروج</Button>}
        </div>

        {!isAdmin ? (
          <div className="max-w-md rounded-2xl border border-slate-800 bg-[#0a0f20] p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2"><LogIn className="w-4 h-4 text-amber-400"/> دخول الأدمن</h2>
            <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <Button className="w-full" onClick={signIn} disabled={loading || !email || !password}>{loading?"جارٍ الدخول...":"دخول"}</Button>
            <p className="text-[11px] text-slate-400">يجب أن يكون للمستخدم `profiles.role = 'admin'` في Supabase.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0c1020] p-5 space-y-2">
                <div className="flex items-center justify-between"><h3 className="font-bold flex items-center gap-2"><Server className="w-4 h-4 text-cyan-400"/> Fazer</h3><span className={`h-2.5 w-2.5 rounded-full ${status?.fazer?.connected?'bg-emerald-400':'bg-amber-400'}`}/></div>
                <div className="text-xs text-slate-300 space-y-1"><div>الحالة: <b className={status?.fazer?.connected?'text-emerald-400':'text-amber-400'}>{status?.fazer?.connected?'متصل':'غير متصل/محاكاة'}</b></div><div>الرصيد: <b className="text-cyan-300 font-mono">{status?.fazer?.balance ?? store.settings.fazer_balance ?? '—'} {status?.fazer?.currency ?? store.settings.fazer_balance_currency ?? ''}</b></div><div>آخر مزامنة باقات: {store.settings.packages_synced_at ? new Date(store.settings.packages_synced_at).toLocaleString('ar-EG') : '—'}</div></div>
                <Button size="sm" className="w-full" onClick={doSync} disabled={syncing}><RefreshCw className={`w-4 h-4 ${syncing?'animate-spin':''}`}/> مزامنة الباقات والرصيد الآن</Button>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0c1020] p-5 space-y-3">
                <h3 className="font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-400"/> سعر الصرف</h3>
                <div className="flex items-center gap-2"><Input type="number" step="0.5" value={egpRate} onChange={(e)=>setEgpRate(Number(e.target.value))} /><span className="text-xs text-slate-400">ج.م/$</span></div>
                <Button size="sm" className="w-full" onClick={saveRate}>حفظ سعر الصرف</Button>
                <p className="text-[11px] text-slate-400">يُستخدم لحساب أسعار البيع/التاجر من تكلفة Fazer بالدولار.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0c1020] p-5 space-y-2">
                <h3 className="font-bold">ملخص الباقات المتزامنة</h3>
                <div className="text-xs text-slate-300 space-y-1"><div>الإجمالي: <b>{store.packages.length}</b></div>{Object.entries(groupedCounts).map(([g,c])=> <div key={g} className="flex justify-between"><span>{g}</span><span className="font-mono">{c}</span></div>)}</div>
                <p className="text-[11px] text-slate-400">لا يوجد إنشاء/تعديل يدوي للباقات؛ المصدر Fazer.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-purple-400"/> التجار (صفحة {mPage}/{mTotalPages})</h2>
                <div className="flex gap-2"><Input placeholder="بحث اسم/هاتف/ID" value={mQuery} onChange={(e)=>setMQuery(e.target.value)} className="w-48"/><Button size="sm" variant="outline" onClick={()=> token && loadMerchants(token,1,mQuery)}>بحث</Button></div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs min-w-[720px]">
                  <thead className="bg-[#0e1428] text-slate-300"><tr><th className="p-3 text-right">التاجر</th><th className="p-3">الرصيد (ج.م)</th><th className="p-3">الهامش %</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {merchants.map((m:any)=> (
                      <tr key={m.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-right"><div className="font-semibold text-white">{m.profile?.full_name || "—"}</div><div className="text-slate-400">{m.profile?.phone || m.user_id}</div></td>
                        <td className="p-3 font-mono font-bold text-emerald-300">{m.balance_egp}</td>
                        <td className="p-3 font-mono">{m.margin_percent}%</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full ${m.is_active?'bg-emerald-500/20 text-emerald-300':'bg-rose-500/20 text-rose-300'}`}>{m.is_active?'مفعل':'موقوف'}</span></td>
                        <td className="p-3"><div className="flex items-center justify-center gap-2"><Button size="sm" variant="outline" onClick={()=>setCredit({id:m.id, amount:"", note:"إضافة رصيد من الأدمن"})}>شحن رصيد</Button><Button size="sm" variant="outline" onClick={()=>setMarginEdit({id:m.id, value:String(m.margin_percent||0)})}>تعديل الهامش</Button></div></td>
                      </tr>
                    ))}
                    {merchants.length===0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">لا يوجد تجار. أنشئ مستخدمًا ثم أضف صفًا في `merchant_accounts`.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" disabled={mPage<=1} onClick={()=> token && loadMerchants(token, mPage-1, mQuery)}>السابق</Button>
                <span className="text-xs text-slate-400">{mPage} / {mTotalPages}</span>
                <Button size="sm" variant="outline" disabled={mPage>=mTotalPages} onClick={()=> token && loadMerchants(token, mPage+1, mQuery)}>التالي</Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 space-y-2">
              <h2 className="font-bold">الباقات المتزامنة (قراءة فقط)</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[420px]">
                <table className="w-full text-xs min-w-[720px]">
                  <thead className="bg-[#0e1428] text-slate-300 sticky top-0"><tr><th className="p-2 text-right">اللعبة</th><th className="p-2 text-right">الباقة</th><th className="p-2">Offer ID</th><th className="p-2">تكلفة $</th><th className="p-2">سعر بيع تقريبي (ج.م)</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {store.packages.slice(0,200).map((p)=> (
                      <tr key={p.id}><td className="p-2 text-right">{p.gameId}</td><td className="p-2 text-right">{p.name}</td><td className="p-2 font-mono text-[11px] text-slate-400">{p.offerId}</td><td className="p-2 font-mono">{p.costUsd || 0}</td><td className="p-2 font-mono">{p.retailPriceEgp}</td></tr>
                    ))}
                    {store.packages.length===0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">لا توجد باقات بعد — اضغط "مزامنة الباقات والرصيد الآن".</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />

      <Dialog open={!!credit} onOpenChange={(o)=>!o && setCredit(null)}>
        <DialogContent className="max-w-sm bg-[#0a0f20] border border-slate-700 text-slate-100"><DialogHeader><DialogTitle>شحن رصيد تاجر</DialogTitle></DialogHeader>
          <div className="space-y-2"><Input type="number" placeholder="المبلغ (ج.م)" value={credit?.amount||""} onChange={(e)=> setCredit(c=>c?{...c, amount:e.target.value}:c)} /><Input placeholder="ملاحظة" value={credit?.note||""} onChange={(e)=> setCredit(c=>c?{...c, note:e.target.value}:c)} /><Button className="w-full" onClick={submitCredit}>تأكيد الإضافة</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!marginEdit} onOpenChange={(o)=>!o && setMarginEdit(null)}>
        <DialogContent className="max-w-sm bg-[#0a0f20] border border-slate-700 text-slate-100"><DialogHeader><DialogTitle>تعديل هامش التاجر (%)</DialogTitle></DialogHeader>
          <div className="space-y-2"><Input type="number" step="0.5" placeholder="الهامش %" value={marginEdit?.value||""} onChange={(e)=> setMarginEdit(m=>m?{...m, value:e.target.value}:m)} /><Button className="w-full" onClick={submitMargin}>حفظ</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
