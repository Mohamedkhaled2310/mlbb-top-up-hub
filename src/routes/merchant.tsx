import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Gamepad2,
  Globe,
  LogIn,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import CheckoutModal from "../components/CheckoutModal";
import { GamePackageIcon } from "../components/GamePackageIcon";
import { ScrollReveal } from "../components/ScrollReveal";
import { loadStoredAuth, supabase, useStore } from "../lib/store/useStore";
import { calcConvertedPrice, calcMerchantUnitPriceEgp, convertEgpToCurrency } from "../lib/pricing";
import { MERCHANT_COUNTRIES, getCountryCurrencyInfo, getCurrencyRate } from "../lib/currency";
import {
  getMerchantDashboardApi,
  getStoreApi,
  loginWithPasswordApi,
  refreshSessionApi,
  updateMyNationalityApi,
} from "../lib/api-client";
import { CopyButton } from "../components/CopyButton";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "../hooks/use-toast";
import type { TopUpPackage } from "../types/store";

export const Route = createFileRoute("/merchant")({ component: MerchantPage });

const MERCHANT_GAMES = [
  { id: "mlbb", label: "Mobile Legends", currency: "Diamonds" },
  { id: "pubg", label: "PUBG Mobile", currency: "UC" },
  { id: "freefire", label: "Free Fire", currency: "Diamonds" },
  { id: "hok", label: "Honor of Kings", currency: "Tokens" },
];

const ORDER_STATUS_LABEL: Record<string, string> = {
  success: "مكتمل",
  failed: "فشل (مسترد)",
  incomplete: "جزئي",
  processing: "قيد التنفيذ",
  pending: "قيد الانتظار",
  cancelled: "ملغي",
};

const LEDGER_TYPE_LABEL: Record<string, string> = {
  admin_credit: "إيداع إداري",
  order_debit: "خصم طلب",
  refund: "استرداد تلقائي",
  adjustment: "تسوية رصيد",
};

function MerchantPage() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dash, setDash] = useState<any>(null);
  const [selectedGameId, setSelectedGameId] = useState("mlbb");
  const [selectedPkgRegion, setSelectedPkgRegion] = useState("global");
  const [pkgSearch, setPkgSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const loadStore = useCallback(async () => {
    try {
      const d = await getStoreApi();
      if (d?.packages) store.setPackages(d.packages);
      if (d?.settings) store.setSettings(d.settings);
    } catch {
      // Ignore background failure
    }
  }, [store]);

  const loadDashboard = useCallback(
    async (
      token: string,
      sessionMeta?: { refreshToken?: string | null | undefined; expiresAt?: number | null | undefined; email?: string | null | undefined },
    ) => {
      const d = await getMerchantDashboardApi(token);
      if (d?.error) throw new Error(d.error);
      setDash(d);
      store.setAuth(token, d.profile, d.merchant, sessionMeta);
      return d;
    },
    [store],
  );

  // Restore stored session & initial store catalog
  useEffect(() => {
    loadStore();
    (async () => {
      const stored = loadStoredAuth();
      if (stored?.accessToken) {
        try {
          await loadDashboard(stored.accessToken);
          return;
        } catch {
          if (stored.refreshToken) {
            try {
              const refreshed = await refreshSessionApi(stored.refreshToken);
              if (refreshed?.accessToken) {
                await loadDashboard(refreshed.accessToken, {
                  refreshToken: refreshed.refreshToken,
                  expiresAt: refreshed.expiresAt,
                  email: refreshed.user?.email,
                });
                return;
              }
            } catch {
              store.logout();
            }
          }
        }
      }

      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            await loadDashboard(token, {
              refreshToken: data.session?.refresh_token,
              expiresAt: data.session?.expires_at,
              email: data.session?.user?.email,
            });
          }
        } catch {
          // Not signed in as merchant
        }
      }
    })();
  }, []);

  const refreshAll = useCallback(
    async (silent = false) => {
      if (!store.accessToken) return;
      if (!silent) setRefreshing(true);
      try {
        await Promise.all([loadDashboard(store.accessToken), loadStore()]);
      } catch {
        // Keep existing state on transient errors
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [store.accessToken, loadDashboard, loadStore],
  );

  // Automatic real-time wallet/orders/packages refresh every 15s and on window focus
  useEffect(() => {
    if (!store.accessToken || !store.merchant) return;
    const interval = setInterval(() => refreshAll(true), 15000);
    const onFocus = () => refreshAll(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshAll(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [store.accessToken, store.merchant, refreshAll]);

  const signIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const authRes = await loginWithPasswordApi(email, password);
      if (authRes?.success && authRes?.accessToken) {
        const d = await loadDashboard(authRes.accessToken, {
          refreshToken: authRes.refreshToken,
          expiresAt: authRes.expiresAt,
          email: authRes.user?.email,
        });
        if (!d?.merchant) {
          toast({
            title: "الحساب غير مفعل كتاجر",
            description: "تم تسجيل الدخول لكن هذا الحساب لا يملك محفظة تاجر بعد. تواصل مع الأدمن.",
          });
          return;
        }
        toast({ title: "تم تسجيل الدخول بنجاح" });
        return;
      }

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const token = data.session?.access_token;
        if (!token) throw new Error("لم يتم إنشاء جلسة");
        await loadDashboard(token, {
          refreshToken: data.session?.refresh_token,
          expiresAt: data.session?.expires_at,
          email: data.session?.user?.email,
        });
        toast({ title: "تم تسجيل الدخول بنجاح" });
        return;
      }

      throw new Error(authRes?.error || "بيانات الدخول غير صحيحة");
    } catch (e: any) {
      toast({ title: "فشل تسجيل الدخول", description: e?.message || "تحقق من البريد وكلمة المرور" });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    store.logout();
    setDash(null);
    store.clearCart();
  };

  const authed = Boolean(store.accessToken && store.merchant);
  const marginPercent = Number(dash?.stats?.margin_percent ?? store.merchant?.margin_percent ?? 0);
  const merchantRegion = dash?.profile?.region || store.profile?.region || "EG";
  const currencyInfo = useMemo(() => getCountryCurrencyInfo(merchantRegion), [merchantRegion]);
  const currencyRate = useMemo(
    () => getCurrencyRate(currencyInfo.currency, store.settings.fx_rates, store.settings.egp_rate),
    [currencyInfo.currency, store.settings.fx_rates, store.settings.egp_rate],
  );

  const getMerchantPrices = useCallback(
    (p: TopUpPackage) => {
      const base = p.merchantBasePriceEgp ?? p.retailPriceEgp;
      const priceEgp = calcMerchantUnitPriceEgp(base, marginPercent, p.costUsd, store.settings.egp_rate);
      const converted = calcConvertedPrice(
        priceEgp,
        store.settings.egp_rate,
        currencyRate,
        currencyInfo.decimals,
        p.costUsd,
        marginPercent,
      );
      return { priceEgp, converted };
    },
    [marginPercent, store.settings.egp_rate, currencyRate, currencyInfo.decimals],
  );

  const rawBalanceEgp = dash?.stats?.balance_egp ?? store.merchant?.balance_egp ?? 0;
  const convertedBalance = useMemo(
    () => convertEgpToCurrency(rawBalanceEgp, store.settings.egp_rate, currencyRate, currencyInfo.decimals),
    [rawBalanceEgp, store.settings.egp_rate, currencyRate, currencyInfo.decimals],
  );

  const handleUpdateNationality = async (newRegion: string) => {
    if (!store.accessToken) return;
    try {
      const res = await updateMyNationalityApi(store.accessToken, newRegion);
      if (res?.error) throw new Error(res.error);
      store.setAuth(store.accessToken, { ...store.profile, region: newRegion }, store.merchant);
      const info = getCountryCurrencyInfo(newRegion);
      toast({
        title: "تم تغيير عملة الحساب",
        description: `تم التحويل تلقائياً إلى عملة: ${info.labelAr} (${info.currency})`,
      });
      await refreshAll();
    } catch (e: any) {
      toast({ title: "فشل تحديث الجنسية", description: e?.message || "حدث خطأ" });
    }
  };

  const gameCounts = useMemo(() => {
    const c: Record<string, number> = { mlbb: 0, pubg: 0, freefire: 0, hok: 0 };
    for (const p of store.packages) {
      if (!p.active) continue;
      const g = p.gameId || "mlbb";
      c[g] = (c[g] || 0) + 1;
    }
    return c;
  }, [store.packages]);

  const gamePackages = useMemo(
    () =>
      store.packages.filter(
        (p) => p.active && (p.gameId === selectedGameId || (selectedGameId === "mlbb" && (!p.gameId || p.gameId === "mlbb"))),
      ),
    [store.packages, selectedGameId],
  );

  const availableRegions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of gamePackages) {
      const r = (Array.isArray(p.regions) && p.regions[0]) || (selectedGameId === "freefire" ? "mena" : "global");
      counts.set(r, (counts.get(r) || 0) + 1);
    }
    const order = ["global", "mena", "eu", "my", "id", "br", "tr", "ph", "sg", "ru", "us", "bd", "cis", "latam", "th", "tw", "vn"];
    return Array.from(counts.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [gamePackages, selectedGameId]);

  const effectivePkgRegion = useMemo(() => {
    if (!availableRegions.length) return "all";
    if (availableRegions.some(([r]) => r === selectedPkgRegion)) return selectedPkgRegion;
    return availableRegions[0]![0];
  }, [availableRegions, selectedPkgRegion]);

  const pkgs = useMemo(() => {
    const q = pkgSearch.trim().toLowerCase();
    return gamePackages.filter((p) => {
      const r = (Array.isArray(p.regions) && p.regions[0]) || (selectedGameId === "freefire" ? "mena" : "global");
      const regionMatch = effectivePkgRegion === "all" || availableRegions.length <= 1 || r === effectivePkgRegion;
      const textMatch = !q || p.name.toLowerCase().includes(q) || p.offerId.toLowerCase().includes(q);
      return regionMatch && textMatch;
    });
  }, [gamePackages, selectedGameId, effectivePkgRegion, availableRegions.length, pkgSearch]);

  const cartCount = store.cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = store.cart.reduce((s, i) => s + i.qty * getMerchantPrices(i.package).priceEgp, 0);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full flex-1 py-5 sm:py-6 space-y-5 sm:space-y-6 pb-28">
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-l from-[#141029] to-[#0b1022] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-white">بوابة التاجر (B2B)</h1>
            <p className="text-xs text-slate-300 mt-1">
              محفظة بخصم تلقائي من السيرفر، استرداد فوري عند فشل الشحن، وأسعار تجارية مخصصة لك.
            </p>
          </div>
          {authed && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshAll(false)}
                disabled={refreshing}
                className="border-purple-500/40 bg-purple-950/30 text-purple-200 hover:bg-purple-900/50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span>تحديث</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4" /> خروج
              </Button>
            </div>
          )}
        </div>

        {!authed ? (
          <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-700/80 bg-gradient-to-b from-[#0d1224] to-[#0a0f20] p-5 sm:p-7 shadow-xl shadow-purple-950/20">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-3">
                <LogIn className="w-7 h-7 text-purple-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">تسجيل دخول التاجر</h2>
              <p className="text-xs text-slate-400 mt-1">ادخل إلى محفظتك وطلباتك المباشرة</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني</label>
                <Input
                  type="email"
                  placeholder="merchant@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 h-11"
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
                  className="mt-1 bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500 h-11"
                />
              </div>
              <Button
                className="w-full h-11 bg-purple-600 hover:bg-purple-500 text-white font-bold"
                onClick={signIn}
                disabled={loading || !email.trim() || !password}
              >
                {loading ? "جارٍ تسجيل الدخول..." : "دخول التاجر"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-4">
              يمكن للأدمن إنشاء حساب تاجر جديد وتعبئة رصيده مباشرة من لوحة <a href="/admin" className="text-purple-300 underline">الإدارة</a>.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0a0f20] px-4 py-3">
              <div className="min-w-0">
                <div className="font-bold text-white truncate flex flex-wrap items-center gap-2">
                  <span>{store.profile?.full_name || store.userEmail || store.merchant?.user_id}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] text-purple-300">
                    <Globe className="w-3 h-3" />
                    <span>{currencyInfo.labelAr} ({currencyInfo.currency})</span>
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                  <span>
                    خصمك الخاص: <b className="text-purple-300">{marginPercent}%</b>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className={store.merchant?.is_active ? "text-emerald-400" : "text-rose-400"}>
                    {store.merchant?.is_active ? "الحساب مفعل" : "الحساب موقوف"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-cyan-300 font-mono text-[11px]">
                    1 USD = {currencyRate > 0 ? currencyRate : store.settings.egp_rate} {currencyInfo.currency} (تلقائي)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={currencyInfo.code}
                    onChange={(e) => handleUpdateNationality(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-400"
                    title="تغيير الجنسية وعملة الحساب"
                  >
                    {MERCHANT_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.labelAr} ({c.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <ScrollReveal>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="rounded-xl border border-emerald-500/30 bg-[#0a1220] p-3.5 sm:p-4 hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="text-[11px] sm:text-xs text-slate-400 flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" /> الرصيد المتاح
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">تلقائي</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-extrabold text-emerald-300 font-mono mt-1">
                    {currencyInfo.currency === "EGP" ? (
                      <>
                        {rawBalanceEgp.toLocaleString("en-US")} <span className="text-xs font-sans">ج.م</span>
                      </>
                    ) : (
                      <>
                        {convertedBalance.toLocaleString("en-US", {
                          minimumFractionDigits: currencyInfo.decimals,
                          maximumFractionDigits: currencyInfo.decimals,
                        })}{" "}
                        <span className="text-xs font-sans">{currencyInfo.symbolAr}</span>
                      </>
                    )}
                  </div>
                  {currencyInfo.currency !== "EGP" && (
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      (رصيد التسوية: {rawBalanceEgp.toLocaleString("en-US")} ج.م)
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#0a0f20] p-3.5 sm:p-4 hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="text-[11px] sm:text-xs text-slate-400">طلبات اليوم</div>
                  <div className="text-lg sm:text-2xl font-extrabold font-mono mt-1">{dash?.stats?.orders_today ?? 0}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#0a0f20] p-3.5 sm:p-4 hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> تم تسليمها اليوم
                  </div>
                  <div className="text-lg sm:text-2xl font-extrabold text-cyan-300 font-mono mt-1">
                    {dash?.stats?.delivered_today ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#0a0f20] p-3.5 sm:p-4 hover:-translate-y-0.5 transition-transform duration-200">
                  <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> غير مكتملة / مرفوضة
                  </div>
                  <div className="text-lg sm:text-2xl font-extrabold text-amber-300 font-mono mt-1">
                    {dash?.stats?.incomplete_orders ?? 0}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={70}>
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                  <Package className="w-4 h-4 text-purple-400" /> باقات الشحن بأسعار التاجر
                </h2>
                <div className="relative w-full md:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={pkgSearch}
                    onChange={(e) => setPkgSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو الكود..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pr-8 pl-3 py-2 text-xs text-white focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MERCHANT_GAMES.map((g) => {
                  const active = selectedGameId === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setSelectedGameId(g.id);
                        setSelectedPkgRegion(g.id === "freefire" ? "mena" : "global");
                      }}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? "border-purple-500 bg-purple-500/20 text-purple-200 shadow-sm"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{g.label}</span>
                      </span>
                      <span className="font-mono text-[11px] rounded bg-slate-950/70 px-1.5 py-0.5 text-cyan-300">
                        {gameCounts[g.id] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              {availableRegions.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[11px] text-slate-400 shrink-0 pl-1">المنطقة:</span>
                  {availableRegions.map(([reg, cnt]) => {
                    const active = effectivePkgRegion === reg;
                    return (
                      <button
                        key={reg}
                        onClick={() => setSelectedPkgRegion(reg)}
                        className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition-all ${
                          active
                            ? "bg-purple-500/25 text-purple-200 border border-purple-500/50"
                            : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>{reg}</span>
                        <span className="text-[10px] opacity-75 font-mono">({cnt})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {pkgs.slice(0, 60).map((p, idx) => {
                  const prices = getMerchantPrices(p);
                  return (
                    <div
                      key={p.id}
                      style={{ animationDelay: `${Math.min(idx, 11) * 25}ms` }}
                      className="animate-meto-card flex items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-purple-500/45 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/10 p-3 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GamePackageIcon
                          category={p.category}
                          diamonds={p.diamonds}
                          bonusDiamonds={p.bonusDiamonds ?? 0}
                          gameId={p.gameId || selectedGameId}
                          currencyName={p.currencyName ?? undefined}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-white truncate">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            تكلفة: ${p.costUsd || 0} • بيع: {p.retailPriceEgp} ج.م
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-left">
                          {currencyInfo.currency === "EGP" ? (
                            <div className="text-xs sm:text-sm font-extrabold text-purple-300 font-mono">
                              {prices.priceEgp} ج.م
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs sm:text-sm font-extrabold text-purple-300 font-mono">
                                {prices.converted} {currencyInfo.symbolAr}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ({prices.priceEgp} ج.م)
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 bg-purple-600 hover:bg-purple-500 text-white"
                          onClick={() => store.addToCart(p)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {pkgs.length === 0 && (
                  <div className="col-span-full py-6 text-center text-xs text-slate-400">
                    لا توجد باقات متزامنة حالياً لهذه اللعبة. قم بمزامنة Fazer من لوحة الإدارة.
                  </div>
                )}
              </div>
            </div>
            </ScrollReveal>

            <ScrollReveal delayMs={80}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4">
                <h3 className="font-bold mb-3 text-sm sm:text-base">آخر الطلبات</h3>
                <div className="space-y-2 max-h-80 overflow-auto text-xs">
                  {(dash?.orders || []).slice(0, 30).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-mono text-cyan-300">
                          <span>{o.order_ref}</span>
                          <CopyButton text={o.order_ref} />
                        </div>
                        <div className="text-slate-400 truncate">
                          {o.player_id} • {o.game_id} • {o.total_egp} ج.م
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === "success"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : o.status === "failed"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {ORDER_STATUS_LABEL[o.status] || o.status}
                      </span>
                    </div>
                  ))}
                  {(!dash?.orders || dash.orders.length === 0) && (
                    <div className="text-slate-400 py-4 text-center">لا توجد طلبات مسجلة بعد.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4">
                <h3 className="font-bold mb-3 text-sm sm:text-base">حركات المحفظة (Ledger)</h3>
                <div className="space-y-2 max-h-80 overflow-auto text-xs">
                  {(dash?.transactions || []).slice(0, 30).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-white">
                          {LEDGER_TYPE_LABEL[t.entry_type] || t.entry_type}
                        </div>
                        <div className="text-slate-400 truncate">{t.note || t.reference_id || "-"}</div>
                      </div>
                      <div
                        className={`shrink-0 font-mono font-bold ${
                          Number(t.amount) >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {Number(t.amount) >= 0 ? "+" : ""}
                        {t.amount}{" "}
                        <span className="text-slate-400 font-normal">(بعدها: {t.balance_after})</span>
                      </div>
                    </div>
                  ))}
                  {(!dash?.transactions || dash.transactions.length === 0) && (
                    <div className="text-slate-400 py-4 text-center">لا توجد حركات مالية بعد.</div>
                  )}
                </div>
              </div>
            </div>
            </ScrollReveal>
          </>
        )}
      </main>

      {authed && store.cart.length > 0 && (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-6 z-40 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-purple-500/40 bg-[#0d1022]/95 backdrop-blur-xl p-3 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm truncate">{cartCount} عنصر في السلة</div>
                <div className="text-[11px] sm:text-xs text-slate-300">
                  إجمالي الخصم: <span className="text-purple-300 font-bold font-mono">{cartTotal} ج.م</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 text-xs"
                onClick={() => store.clearCart()}
              >
                تفريغ
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm px-3 sm:px-4"
                onClick={() => setCheckoutOpen(true)}
              >
                تنفيذ الآن
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={store.cart}
        onUpdateQty={store.updateCartQty}
        onRemove={store.removeFromCart}
        onClear={store.clearCart}
        onOrderSuccess={() => refreshAll(true)}
      />
    </div>
  );
}
