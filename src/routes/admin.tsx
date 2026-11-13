import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  DollarSign,
  Lock,
  LogOut,
  Package,
  Power,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ScrollReveal } from "../components/ScrollReveal";
import { CopyButton } from "../components/CopyButton";
import { loadStoredAuth, supabase, useStore } from "../lib/store/useStore";
import {
  adminCreateMerchantApi,
  adminCreditMerchantApi,
  adminListMerchantsApi,
  adminListOrdersApi,
  adminSetMarginApi,
  adminSetMerchantRegionApi,
  adminSyncBinanceRateApi,
  adminSyncFazerApi,
  adminToggleMerchantApi,
  adminUpdateEgpRateApi,
  checkSystemStatusApi,
  getStoreApi,
  loginWithPasswordApi,
  refreshSessionApi,
} from "../lib/api-client";
import { MERCHANT_COUNTRIES, getCountryCurrencyInfo } from "../lib/currency";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "../hooks/use-toast";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "Meto#";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)] || "7";
  }
  return out;
}

const DARK_INPUT =
  "bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-amber-400";

function AdminPage() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [lastBalanceCheck, setLastBalanceCheck] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [egpRate, setEgpRate] = useState<number>(store.settings.egp_rate || 50);
  const [rateMode, setRateMode] = useState<"manual" | "binance_auto">(store.settings.egp_rate_mode || "manual");
  const [syncingBinance, setSyncingBinance] = useState(false);

  const [merchants, setMerchants] = useState<any[]>([]);
  const [mPage, setMPage] = useState(1);
  const [mTotalPages, setMTotalPages] = useState(1);
  const [mQuery, setMQuery] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [pkgGameFilter, setPkgGameFilter] = useState<string>("all");

  const [credit, setCredit] = useState<{ id: string; amount: string; note: string } | null>(null);
  const [marginEdit, setMarginEdit] = useState<{ id: string; value: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingMerchant, setCreatingMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    region: "EG",
    marginPercent: "5",
    initialBalanceEgp: "1000",
  });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadStore = useCallback(async () => {
    try {
      const d = await getStoreApi();
      if (d?.packages) store.setPackages(d.packages);
      if (d?.settings) {
        store.setSettings(d.settings);
        setEgpRate(d.settings.egp_rate || 50);
        if (d.settings.egp_rate_mode) {
          setRateMode(d.settings.egp_rate_mode);
        }
      }
    } catch {
      // Ignore transient load error
    }
  }, [store]);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await checkSystemStatusApi();
      setStatus(s);
      setLastBalanceCheck(new Date().toLocaleTimeString("ar-EG"));
      if (s?.fazer_balance != null || s?.fazer?.balance != null) {
        store.setSettings({
          fazer_balance: s.fazer?.balance ?? s.fazer_balance,
          fazer_balance_currency: s.fazer?.currency ?? s.fazer_balance_currency ?? "USD",
          fazer_balance_updated_at: s.fazer_balance_updated_at,
        });
      }
    } catch {
      // Ignore transient check failure
    }
  }, [store]);

  const loadMerchants = useCallback(async (token: string, page = 1, q = "") => {
    const d = await adminListMerchantsApi(token, { page, limit: 10, q });
    if (d?.error) throw new Error(d.error);
    setMerchants(d.merchants || []);
    setMPage(d.page || page);
    setMTotalPages(d.totalPages || 1);
  }, []);

  const loadOrders = useCallback(async (token: string) => {
    try {
      const d = await adminListOrdersApi(token, 25);
      if (d?.orders) setOrders(d.orders);
    } catch {
      // Ignore order list error
    }
  }, []);

  // Initial load & restore session
  useEffect(() => {
    loadStore();
    refreshStatus();

    if (typeof window !== "undefined") {
      try {
        const savedEmail = localStorage.getItem("admin_saved_email");
        if (savedEmail) setEmail(savedEmail);
      } catch {
        // ignore
      }
    }

    (async () => {
      const stored = loadStoredAuth();
      if (stored?.accessToken) {
        try {
          await loadMerchants(stored.accessToken, 1, "");
          await loadOrders(stored.accessToken);
          store.setAuth(stored.accessToken, stored.profile, stored.merchant);
          setIsAdmin(true);
          return;
        } catch {
          if (stored.refreshToken) {
            try {
              const refreshed = await refreshSessionApi(stored.refreshToken);
              if (refreshed?.accessToken) {
                await loadMerchants(refreshed.accessToken, 1, "");
                await loadOrders(refreshed.accessToken);
                store.setAuth(refreshed.accessToken, refreshed.profile, refreshed.merchant, {
                  refreshToken: refreshed.refreshToken,
                  expiresAt: refreshed.expiresAt,
                  email: refreshed.user?.email,
                });
                setIsAdmin(true);
                return;
              }
            } catch {
              setIsAdmin(false);
            }
          }
        }
      }

      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            await loadMerchants(token, 1, "");
            await loadOrders(token);
            store.setAuth(token, null, null, {
              refreshToken: data.session?.refresh_token,
              expiresAt: data.session?.expires_at,
              email: data.session?.user?.email,
            });
            setIsAdmin(true);
          }
        } catch {
          setIsAdmin(false);
        }
      }
    })();
  }, []);

  // Live auto-refresh of Fazer wallet balance, store packages, merchants, and orders
  useEffect(() => {
    const refreshLive = () => {
      refreshStatus();
      loadStore();
      if (isAdmin && store.accessToken) {
        loadMerchants(store.accessToken, mPage, mQuery).catch(() => {});
        loadOrders(store.accessToken).catch(() => {});
      }
    };
    const interval = setInterval(refreshLive, 15000);
    const onFocus = () => refreshLive();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshLive();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAdmin, store.accessToken, mPage, mQuery, refreshStatus, loadStore, loadMerchants, loadOrders]);

  const signIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        try {
          if (rememberMe) {
            localStorage.setItem("admin_saved_email", email.trim());
          } else {
            localStorage.removeItem("admin_saved_email");
          }
        } catch {
          // ignore
        }
      }

      let token: string | undefined;
      let sessionMeta: { refreshToken?: string | undefined; expiresAt?: number | undefined; email?: string | undefined } | undefined;
      let profileData: any = null;
      let merchantData: any = null;

      const authRes = await loginWithPasswordApi(email, password);
      if (authRes?.success && authRes?.accessToken) {
        token = authRes.accessToken;
        profileData = authRes.profile;
        merchantData = authRes.merchant;
        sessionMeta = {
          refreshToken: authRes.refreshToken,
          expiresAt: authRes.expiresAt,
          email: authRes.user?.email,
        };
      } else if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        token = data.session?.access_token;
        sessionMeta = {
          refreshToken: data.session?.refresh_token,
          expiresAt: data.session?.expires_at,
          email: data.session?.user?.email,
        };
      } else {
        throw new Error(authRes?.error || "بيانات الدخول غير صحيحة");
      }

      if (!token) throw new Error("لم يتم إنشاء جلسة دخول");
      await loadMerchants(token, 1, "");
      await loadOrders(token);
      store.setAuth(token, profileData, merchantData, sessionMeta, rememberMe);
      setIsAdmin(true);
      refreshStatus();
      toast({ title: "تم الدخول كأدمن بنجاح" });
    } catch (e: any) {
      setIsAdmin(false);
      toast({ title: "فشل الدخول أو غير مصرح", description: e?.message || "بيانات الدخول غير صحيحة" });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    store.logout();
    setIsAdmin(false);
    setMerchants([]);
    setOrders([]);
  };

  const token = store.accessToken;

  const doSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const r = await adminSyncFazerApi(token);
      if (!r?.ok) throw new Error(r?.error || "فشلت المزامنة");
      const bd = r?.catalog?.gamesBreakdown
        ? Object.entries(r.catalog.gamesBreakdown)
            .map(([g, n]) => `${g}: ${n}`)
            .join(" | ")
        : "";
      toast({
        title: "تمت مزامنة Fazer بنجاح",
        description: `إجمالي الباقات: ${r?.catalog?.count || 0}${bd ? ` (${bd})` : ""} • رصيد: ${r?.account?.balance ?? "—"} ${r?.account?.currency ?? "USD"}`,
      });
      await Promise.all([loadStore(), refreshStatus()]);
    } catch (e: any) {
      toast({ title: "خطأ في المزامنة", description: e?.message });
    } finally {
      setSyncing(false);
    }
  };

  const saveRate = async (modeToSave?: "manual" | "binance_auto") => {
    if (!token) return;
    const mode = modeToSave || rateMode;
    try {
      const r = await adminUpdateEgpRateApi(token, { egp_rate: Number(egpRate), mode });
      if (r?.error) throw new Error(r.error);
      setRateMode(mode);
      toast({
        title: mode === "manual" ? "تم تثبيت سعر الصرف يدوياً (🔒 مقفل)" : "تم حفظ سعر الصرف وتفعيل التحديث التلقائي",
        description: `${egpRate} ج.م / $ ${mode === "manual" ? "• لن يتغير تلقائياً" : ""}`,
      });
      await loadStore();
    } catch (e: any) {
      toast({ title: "تعذر الحفظ", description: e?.message });
    }
  };

  const syncBinance = async () => {
    if (!token) return;
    setSyncingBinance(true);
    try {
      const r = await adminSyncBinanceRateApi(token);
      if (r?.error) throw new Error(r.error);
      if (r?.egp_rate) {
        setEgpRate(r.egp_rate);
        setRateMode("binance_auto");
        toast({
          title: "تم تطبيق سعر دولار بينانس P2P بنجاح ⚡",
          description: `السعر المطبق: ${r.egp_rate} ج.م / USDT (سوق بينانس مصر)`,
        });
      }
      await loadStore();
    } catch (e: any) {
      toast({ title: "فشل جلب سعر بينانس", description: e?.message });
    } finally {
      setSyncingBinance(false);
    }
  };

  const submitCredit = async () => {
    if (!token || !credit) return;
    try {
      const r = await adminCreditMerchantApi(token, {
        merchant_id: credit.id,
        amount: Number(credit.amount),
        note: credit.note || "شحن رصيد",
      });
      if (r?.error) throw new Error(r.error);
      toast({ title: "تمت إضافة الرصيد لمحفظة التاجر" });
      setCredit(null);
      await loadMerchants(token, mPage, mQuery);
    } catch (e: any) {
      toast({ title: "فشل", description: e?.message });
    }
  };

  const submitMargin = async () => {
    if (!token || !marginEdit) return;
    try {
      const r = await adminSetMarginApi(token, {
        merchant_id: marginEdit.id,
        margin_percent: Number(marginEdit.value),
      });
      if (r?.error) throw new Error(r.error);
      toast({ title: "تم تحديث هامش التاجر" });
      setMarginEdit(null);
      await loadMerchants(token, mPage, mQuery);
    } catch (e: any) {
      toast({ title: "فشل", description: e?.message });
    }
  };

  const toggleMerchantActive = async (m: any) => {
    if (!token) return;
    try {
      const r = await adminToggleMerchantApi(token, { merchant_id: m.id, is_active: !m.is_active });
      if (r?.error) throw new Error(r.error);
      toast({ title: !m.is_active ? "تم تفعيل التاجر" : "تم إيقاف التاجر مؤقتاً" });
      await loadMerchants(token, mPage, mQuery);
    } catch (e: any) {
      toast({ title: "فشل تحديث الحالة", description: e?.message });
    }
  };

  const handleCreateMerchant = async (quickDemo = false) => {
    if (!token) return;
    setCreatingMerchant(true);
    try {
      const payload = quickDemo
        ? {
            email: "merchant.demo@metostore.com",
            password: generateTempPassword(),
            fullName: "تاجر تجريبي METO",
            phone: "01000000001",
            region: "EG",
            marginPercent: 5,
            initialBalanceEgp: 1000,
          }
        : {
            email: newMerchant.email.trim(),
            password: newMerchant.password.trim(),
            fullName: newMerchant.fullName.trim() || "تاجر معتمد",
            phone: newMerchant.phone.trim(),
            region: newMerchant.region || "EG",
            marginPercent: Number(newMerchant.marginPercent || 0),
            initialBalanceEgp: Number(newMerchant.initialBalanceEgp || 0),
          };
      const res = await adminCreateMerchantApi(token, payload);
      if (res?.error) throw new Error(res.error);
      setCreatedCredentials(res.credentials || { email: payload.email, password: payload.password });
      setCreateOpen(false);
      setNewMerchant({
        email: "",
        password: "",
        fullName: "",
        phone: "",
        region: "EG",
        marginPercent: "5",
        initialBalanceEgp: "1000",
      });
      toast({
        title: "تم إنشاء وتفعيل حساب التاجر بنجاح",
        description: `${payload.email} • رصيد افتتاحي: ${payload.initialBalanceEgp} ج.م`,
      });
      await loadMerchants(token, 1, "");
    } catch (e: any) {
      toast({ title: "فشل إنشاء التاجر", description: e?.message || "تحقق من البيانات" });
    } finally {
      setCreatingMerchant(false);
    }
  };

  const handleChangeMerchantRegion = async (merchantId: string, newRegion: string) => {
    if (!token) return;
    try {
      const res = await adminSetMerchantRegionApi(token, { merchant_id: merchantId, region: newRegion });
      if (res?.error) throw new Error(res.error);
      const info = getCountryCurrencyInfo(newRegion);
      toast({
        title: "تم تحديث جنسية التاجر وعملته",
        description: `${info.labelAr} (${info.currency})`,
      });
      await loadMerchants(token, mPage, mQuery);
    } catch (e: any) {
      toast({ title: "فشل تحديث الجنسية", description: e?.message || "حدث خطأ" });
    }
  };

  const copyValue = async (label: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const groupedCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of store.packages) {
      const key = p.gameId || "unknown";
      m[key] = (m[key] || 0) + 1;
    }
    return m;
  }, [store.packages]);

  const filteredAdminPackages = useMemo(() => {
    if (pkgGameFilter === "all") return store.packages;
    return store.packages.filter((p) => (p.gameId || "mlbb") === pkgGameFilter);
  }, [store.packages, pkgGameFilter]);

  const liveBalance = status?.fazer?.balance ?? status?.fazer_balance ?? store.settings.fazer_balance ?? null;
  const liveCurrency = status?.fazer?.currency ?? status?.fazer_balance_currency ?? store.settings.fazer_balance_currency ?? "USD";

  return (
    <div className="min-h-screen min-h-dvh bg-[#070912] text-slate-100 flex flex-col font-sans flex-1">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full flex-1 py-5 sm:py-6 space-y-5 sm:space-y-6 pb-8 sm:pb-10">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-l from-[#14172b] to-[#0b1020] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-amber-400" /> لوحة تحكم الأدمن
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              مراقبة رصيد Fazer الحي تلقائياً، مزامنة باقات كافة الألعاب، سعر الصرف، وإدارة التجار.
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white self-start sm:self-auto"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" /> خروج
            </Button>
          )}
        </div>

        {!isAdmin ? (
          <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-700/80 bg-gradient-to-b from-[#13172a] to-[#0a0f20] p-5 sm:p-7 shadow-xl shadow-amber-950/10">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
                <Shield className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">دخول لوحة الأدمن</h2>
              <p className="text-xs text-slate-400 mt-1">
                تسجيل الدخول للمشرفين المصرح لهم فقط
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 h-11 ${DARK_INPUT}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">كلمة المرور</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  className={`mt-1 h-11 ${DARK_INPUT}`}
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                  />
                  <span>تذكرني على هذا الجهاز</span>
                </label>
              </div>
              <Button
                className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold"
                onClick={signIn}
                disabled={loading || !email.trim() || !password}
              >
                {loading ? "جارٍ الدخول..." : "دخول لوحة الإدارة"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Live Fazer Wallet Balance + Auto Refresh */}
              <div className="rounded-2xl border border-cyan-500/30 bg-[#0b1224] p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-white">
                      <Wallet className="w-4 h-4 text-cyan-400" /> رصيد محفظة Fazer الفعلي
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        status?.fazer?.connected
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          status?.fazer?.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                        }`}
                      />
                      {status?.fazer?.connected ? "متصل" : "تحقق من المفتاح"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">الرصيد المتاح:</span>
                    <span className="text-2xl font-black text-cyan-300 font-mono">
                      {liveBalance !== null && liveBalance !== undefined ? liveBalance : "—"}{" "}
                      <span className="text-xs font-sans text-slate-400">{liveCurrency}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    {status?.fazer?.name && <div>الحساب: <b className="text-slate-200">{status.fazer.name}</b></div>}
                    {status?.fazer?.message && !status?.fazer?.connected && (
                      <div className="text-amber-300">{status.fazer.message}</div>
                    )}
                    <div>تحديث الرصيد تلقائياً كل 15ث {lastBalanceCheck ? `• آخر فحص: ${lastBalanceCheck}` : ""}</div>
                    <div>
                      آخر مزامنة للباقات:{" "}
                      {store.settings.packages_synced_at
                        ? new Date(store.settings.packages_synced_at).toLocaleString("ar-EG")
                        : "لم تتم بعد"}
                    </div>
                  </div>
                </div>
                <Button size="sm" className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold" onClick={doSync} disabled={syncing}>
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> مزامنة الباقات والرصيد الآن
                </Button>
              </div>

              {/* Exchange Rate */}
              <div className="rounded-2xl border border-amber-500/25 bg-[#0c1020] p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-white">
                      <DollarSign className="w-4 h-4 text-amber-400" /> سعر دولار المتجر
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        rateMode === "manual"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {rateMode === "manual" ? (
                        <>
                          <Lock className="w-3 h-3" /> تثبيت يدوي (مقفل)
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" /> تلقائي من بينانس
                        </>
                      )}
                    </span>
                  </div>

                  {/* Binance P2P Live Rate Indicator & Sync */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> سعر بينانس P2P الفعلي:
                      </div>
                      <div className="font-mono font-bold text-amber-300">
                        {store.settings.binance_rate ? `${store.settings.binance_rate} ج.م / USDT` : "سوق مصر الحي"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold gap-1"
                      onClick={syncBinance}
                      disabled={syncingBinance}
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingBinance ? "animate-spin" : ""}`} />
                      {syncingBinance ? "جارٍ الجلب..." : "تطبيق سعر بينانس"}
                    </Button>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block font-semibold mb-1">
                      السعر الحالي المعتمد:
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={egpRate}
                        onChange={(e) => setEgpRate(Number(e.target.value))}
                        className={`font-mono ${DARK_INPUT}`}
                      />
                      <span className="text-xs text-slate-400 shrink-0 font-bold">ج.م / $</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {rateMode === "manual"
                      ? "🔒 وضع التثبيت اليدوي مفعّل: لن يتغير السعر تلقائياً أبداً عند فتح المتجر، وسيبقى ثابتاً حتى تحديثه يدوياً."
                      : "⚡ وضع التحديث التلقائي مفعّل: يتم تحديث السعر تلقائياً وفقاً لأسعار صفقات بينانس P2P الفعلية."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1 text-xs"
                    onClick={() => saveRate("manual")}
                  >
                    <Lock className="w-3.5 h-3.5" /> تثبيت يدوياً
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold gap-1 text-xs"
                    onClick={() => saveRate("binance_auto")}
                  >
                    <Zap className="w-3.5 h-3.5" /> تفعيل التلقائي
                  </Button>
                </div>
              </div>

              {/* Packages breakdown */}
              <div className="rounded-2xl border border-slate-800 bg-[#0c1020] p-4 sm:p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-white">
                    <Server className="w-4 h-4 text-emerald-400" /> ملخص الباقات المتزامنة
                  </h3>
                  <span className="text-sm font-black font-mono text-emerald-300">{store.packages.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {["mlbb", "pubg", "freefire", "hok"].map((g) => (
                    <div key={g} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 flex items-center justify-between">
                      <span className="uppercase font-bold text-slate-300">{g}</span>
                      <span className="font-mono font-bold text-cyan-300">{groupedCounts[g] || 0}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  المصدر تلقائي من FazerCards لكل الألعاب الأربعة بدون تعديل يدوي.
                </p>
              </div>
            </div>
            </ScrollReveal>

            {createdCredentials && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> تم جاهزية حساب التاجر الجديد للدخول فوراً!
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/merchant"
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 transition-colors"
                    >
                      افتح بوابة التاجر الآن
                    </a>
                    <button
                      onClick={() => setCreatedCredentials(null)}
                      className="text-xs text-slate-400 hover:text-white px-2"
                    >
                      إخفاء
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-slate-950/70 px-3 py-2">
                    <span className="truncate">{createdCredentials.email}</span>
                    <button onClick={() => copyValue("email", createdCredentials.email)} className="text-emerald-300 hover:text-white shrink-0">
                      {copiedField === "email" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-slate-950/70 px-3 py-2">
                    <span className="truncate">{createdCredentials.password}</span>
                    <button onClick={() => copyValue("pw", createdCredentials.password)} className="text-emerald-300 hover:text-white shrink-0">
                      {copiedField === "pw" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Merchants section */}
            <ScrollReveal delayMs={70}>
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <h2 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                  <Users className="w-4 h-4 text-purple-400" /> التجار (صفحة {mPage}/{mTotalPages})
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="بحث اسم/بريد/هاتف..."
                    value={mQuery}
                    onChange={(e) => setMQuery(e.target.value)}
                    className={`w-full sm:w-48 h-9 text-xs ${DARK_INPUT}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                    onClick={() => token && loadMerchants(token, 1, mQuery)}
                  >
                    بحث
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                    onClick={() => setCreateOpen(true)}
                  >
                    <UserPlus className="w-4 h-4" /> إضافة تاجر جديد
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={creatingMerchant}
                    className="border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
                    onClick={() => handleCreateMerchant(true)}
                  >
                    <Sparkles className="w-4 h-4" /> {creatingMerchant ? "جارٍ الإنشاء..." : "توليد تاجر تجريبي (1000 ج.م)"}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs min-w-[760px]">
                  <thead className="bg-[#0e1428] text-slate-300">
                    <tr>
                      <th className="p-3 text-right">التاجر</th>
                      <th className="p-3">الجنسية / العملة</th>
                      <th className="p-3">الرصيد (ج.م)</th>
                      <th className="p-3">نسبة الخصم %</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {merchants.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-right">
                          <div className="font-semibold text-white">{m.profile?.full_name || "—"}</div>
                          <div className="text-slate-400 font-mono text-[11px]">
                            {m.email || m.profile?.phone || m.user_id}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={m.profile?.region || "EG"}
                            onChange={(e) => handleChangeMerchantRegion(m.id, e.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-purple-400"
                            title="تغيير جنسية التاجر والعملة"
                          >
                            {MERCHANT_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.labelAr} ({c.currency})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-300">{m.balance_egp}</td>
                        <td className="p-3 text-center font-mono text-purple-300">{m.margin_percent}%</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              m.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {m.is_active ? "مفعل" : "موقوف"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                              onClick={() => setCredit({ id: m.id, amount: "", note: "إضافة رصيد من الأدمن" })}
                            >
                              شحن رصيد
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                              onClick={() => setMarginEdit({ id: m.id, value: String(m.margin_percent || 0) })}
                            >
                              تعديل الهامش
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`border-slate-700 ${
                                m.is_active
                                  ? "bg-rose-950/30 text-rose-300 hover:bg-rose-900/50"
                                  : "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50"
                              }`}
                              onClick={() => toggleMerchantActive(m)}
                              title={m.is_active ? "إيقاف التاجر" : "تفعيل التاجر"}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {merchants.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          لا يوجد تجار مسجلون بعد — اضغط "إضافة تاجر جديد" أو "توليد تاجر تجريبي".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                  disabled={mPage <= 1}
                  onClick={() => token && loadMerchants(token, mPage - 1, mQuery)}
                >
                  السابق
                </Button>
                <span className="text-xs text-slate-400 font-mono">
                  {mPage} / {mTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                  disabled={mPage >= mTotalPages}
                  onClick={() => token && loadMerchants(token, mPage + 1, mQuery)}
                >
                  التالي
                </Button>
              </div>
              </div>
            </ScrollReveal>

            {/* Recent orders monitor */}
            <ScrollReveal delayMs={70}>
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 space-y-3">
              <h2 className="font-bold text-sm sm:text-base">أحدث الطلبات في النظام ({orders.length})</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-72">
                <table className="w-full text-xs min-w-[680px]">
                  <thead className="bg-[#0e1428] text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2.5 text-right">المرجع</th>
                      <th className="p-2.5 text-right">اللعبة / اللاعب</th>
                      <th className="p-2.5">النوع</th>
                      <th className="p-2.5">الإجمالي</th>
                      <th className="p-2.5">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {orders.map((o: any) => (
                      <tr key={o.id}>
                        <td className="p-2.5 text-right font-mono text-cyan-300">
                          <div className="flex items-center gap-1.5">
                            <span>{o.order_ref}</span>
                            <CopyButton text={o.order_ref} />
                          </div>
                        </td>
                        <td className="p-2.5 text-right">
                          <span className="uppercase font-bold text-slate-300">{o.game_id}</span> • {o.player_id}
                        </td>
                        <td className="p-2.5 text-center">{o.merchant_id ? "تاجر B2B" : "عميل"}</td>
                        <td className="p-2.5 text-center font-mono">{o.total_egp} ج.م</td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === "success"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : o.status === "failed"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-5 text-center text-slate-400">
                          لا توجد طلبات مسجلة بعد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </ScrollReveal>

            {/* Filterable packages table */}
            <ScrollReveal delayMs={70}>
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                  <Package className="w-4 h-4 text-cyan-400" /> الباقات المتزامنة ({filteredAdminPackages.length})
                </h2>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {["all", "mlbb", "pubg", "freefire", "hok"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setPkgGameFilter(g)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                        pkgGameFilter === g
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {g === "all" ? "الكل" : g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[420px]">
                <table className="w-full text-xs min-w-[720px]">
                  <thead className="bg-[#0e1428] text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2.5 text-right">اللعبة</th>
                      <th className="p-2.5 text-right">الباقة</th>
                      <th className="p-2.5">Offer ID</th>
                      <th className="p-2.5">تكلفة $</th>
                      <th className="p-2.5">سعر البيع (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredAdminPackages.slice(0, 200).map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5 text-right uppercase font-bold text-slate-300">{p.gameId}</td>
                        <td className="p-2.5 text-right text-white">{p.name}</td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">{p.offerId}</td>
                        <td className="p-2.5 text-center font-mono">{p.costUsd || 0}</td>
                        <td className="p-2.5 text-center font-mono text-emerald-300">{p.retailPriceEgp}</td>
                      </tr>
                    ))}
                    {filteredAdminPackages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          لا توجد باقات بعد — اضغط "مزامنة الباقات والرصيد الآن".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </ScrollReveal>
          </>
        )}
      </main>
      <Footer />

      {/* Create Merchant Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-[#0a0f20] border border-purple-500/40 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-4 h-4 text-purple-400" /> إنشاء حساب تاجر جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold">البريد الإلكتروني *</label>
              <Input
                type="email"
                placeholder="merchant@example.com"
                value={newMerchant.email}
                onChange={(e) => setNewMerchant((s) => ({ ...s, email: e.target.value }))}
                className={`mt-1 ${DARK_INPUT}`}
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold">كلمة المرور *</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="text"
                  placeholder="6 أحرف على الأقل"
                  value={newMerchant.password}
                  onChange={(e) => setNewMerchant((s) => ({ ...s, password: e.target.value }))}
                  className={`font-mono ${DARK_INPUT}`}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 shrink-0"
                  onClick={() => setNewMerchant((s) => ({ ...s, password: generateTempPassword() }))}
                >
                  توليد
                </Button>
              </div>
            </div>
            <div>
              <label className="text-slate-300 font-semibold">جنسية التاجر (لتحويل الأسعار تلقائياً لعملته)</label>
              <select
                value={newMerchant.region}
                onChange={(e) => setNewMerchant((s) => ({ ...s, region: e.target.value }))}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none ${DARK_INPUT}`}
              >
                {MERCHANT_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.labelAr} — {c.currency} ({c.symbolAr})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold">اسم التاجر</label>
                <Input
                  placeholder="أحمد للتجارة"
                  value={newMerchant.fullName}
                  onChange={(e) => setNewMerchant((s) => ({ ...s, fullName: e.target.value }))}
                  className={`mt-1 ${DARK_INPUT}`}
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold">الهاتف</label>
                <Input
                  placeholder="010..."
                  value={newMerchant.phone}
                  onChange={(e) => setNewMerchant((s) => ({ ...s, phone: e.target.value }))}
                  className={`mt-1 ${DARK_INPUT}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold">نسبة الخصم %</label>
                <Input
                  type="number"
                  step="0.5"
                  value={newMerchant.marginPercent}
                  onChange={(e) => setNewMerchant((s) => ({ ...s, marginPercent: e.target.value }))}
                  className={`mt-1 font-mono ${DARK_INPUT}`}
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold">رصيد افتتاحي (ج.م)</label>
                <Input
                  type="number"
                  value={newMerchant.initialBalanceEgp}
                  onChange={(e) => setNewMerchant((s) => ({ ...s, initialBalanceEgp: e.target.value }))}
                  className={`mt-1 font-mono ${DARK_INPUT}`}
                />
              </div>
            </div>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-10"
              disabled={creatingMerchant || !newMerchant.email.trim() || newMerchant.password.length < 6}
              onClick={() => handleCreateMerchant(false)}
            >
              {creatingMerchant ? "جارٍ الإنشاء..." : "إنشاء وتفعيل الحساب الآن"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Merchant Modal */}
      <Dialog open={!!credit} onOpenChange={(o) => !o && setCredit(null)}>
        <DialogContent className="max-w-sm bg-[#0a0f20] border border-slate-700 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">شحن رصيد تاجر</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            <Input
              type="number"
              placeholder="المبلغ (ج.م)"
              value={credit?.amount || ""}
              onChange={(e) => setCredit((c) => (c ? { ...c, amount: e.target.value } : c))}
              className={DARK_INPUT}
            />
            <Input
              placeholder="ملاحظة"
              value={credit?.note || ""}
              onChange={(e) => setCredit((c) => (c ? { ...c, note: e.target.value } : c))}
              className={DARK_INPUT}
            />
            <Button className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold" onClick={submitCredit}>
              تأكيد الإضافة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Margin Modal */}
      <Dialog open={!!marginEdit} onOpenChange={(o) => !o && setMarginEdit(null)}>
        <DialogContent className="max-w-sm bg-[#0a0f20] border border-slate-700 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">تعديل هامش التاجر (%)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            <Input
              type="number"
              step="0.5"
              placeholder="الهامش %"
              value={marginEdit?.value || ""}
              onChange={(e) => setMarginEdit((m) => (m ? { ...m, value: e.target.value } : m))}
              className={DARK_INPUT}
            />
            <Button className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold" onClick={submitMargin}>
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
