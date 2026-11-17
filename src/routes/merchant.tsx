import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gamepad2,
  Globe,
  LogIn,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import CheckoutModal from "../components/CheckoutModal";
import { GamePackageIcon } from "../components/GamePackageIcon";
import { ScrollReveal } from "../components/ScrollReveal";
import { getFreshAuthToken, loadStoredAuth, supabase, useStore } from "../lib/store/useStore";
import { calcConvertedPrice, calcMerchantUnitPriceEgp, convertEgpToCurrency, formatDecimals3, round3 } from "../lib/pricing";
import { filterPackagesForServer, getGameServers, getServerLabel } from "../lib/regions";
import { MERCHANT_COUNTRIES, getCountryCurrencyInfo, getCurrencyRate } from "../lib/currency";
import {
  getMerchantDashboardApi,
  getStoreApi,
  loginWithPasswordApi,
  merchantSyncOrderWithFazerApi,
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

const REGION_LABELS: Record<string, string> = {
  global: "عالمي (Global)",
  mena: "الشرق الأوسط (MENA)",
  br: "البرازيل (Brazil)",
  id: "إندونيسيا (Indonesia)",
  my: "ماليزيا (Malaysia)",
  tr: "تركيا (Turkey)",
  ph: "الفلبين (Philippines)",
  ru: "روسيا (Russia)",
  vn: "فيتنام (Vietnam)",
  bd: "بنغلاديش (Bangladesh)",
  eu: "أوروبا (Europe)",
  us: "أمريكا (USA)",
};

function getRegionBadgeLabel(reg: string): string {
  const r = (reg || "").trim().toLowerCase();
  return REGION_LABELS[r] || r.toUpperCase();
}

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
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dash, setDash] = useState<any>(null);
  const [selectedGameId, setSelectedGameId] = useState("mlbb");
  const [selectedPkgRegion, setSelectedPkgRegion] = useState("global");
  const [pkgSearch, setPkgSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("meto_saved_merchant_email");
      if (saved) setEmail(saved);
    }
  }, []);

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
      remember = true,
    ) => {
      let activeTok = token;
      let d = await getMerchantDashboardApi(activeTok);
      if (d?.error === "unauthorized") {
        const fresh = await getFreshAuthToken(true);
        if (fresh && fresh !== activeTok) {
          activeTok = fresh;
          d = await getMerchantDashboardApi(activeTok);
        }
      }
      if (d?.error) throw new Error(d.error);
      setDash(d);
      store.setAuth(activeTok, d.profile, d.merchant, sessionMeta, remember);
      return d;
    },
    [store],
  );

  // Restore stored session safely ONCE on initial mount (no duplicate calls)
  useEffect(() => {
    // Only fetch store packages once if empty
    if (!store.packages || store.packages.length === 0) {
      loadStore();
    }
    (async () => {
      const freshToken = await getFreshAuthToken();
      if (freshToken) {
        try {
          await loadDashboard(freshToken);
          return;
        } catch {
          // Keep current stored session on network glitch
        }
      }
      const stored = loadStoredAuth();
      if (stored?.accessToken) {
        try {
          await loadDashboard(stored.accessToken);
        } catch {
          // Keep existing state
        }
      }
    })();
  }, []); // Run ONCE on mount only!

  const refreshAll = useCallback(
    async (silent = false) => {
      const activeToken = (await getFreshAuthToken()) || store.accessToken;
      if (!activeToken) return;
      if (!silent) setRefreshing(true);
      try {
        // Fast-path: Only refresh merchant wallet & orders. Packages do not change every second!
        await loadDashboard(activeToken);
      } catch {
        // Keep existing state on transient errors
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [store.accessToken, loadDashboard],
  );

  const syncOrder = async (orderId: string) => {
    const activeToken = (await getFreshAuthToken()) || store.accessToken;
    if (!activeToken) {
      toast({ title: "خطأ", description: "جلسة التاجر غير صالحة" });
      return;
    }
    setSyncingOrderId(orderId);
    try {
      const res = await merchantSyncOrderWithFazerApi(activeToken, { order_id: orderId });
      if (res?.error) {
        toast({ title: "فشل تحديث حالة الطلب", description: res.error, variant: "destructive" });
        return;
      }
      toast({
        title:
          res.new_status === "success"
            ? "اكتملت العملية بنجاح! 🚀"
            : res.new_status === "failed"
              ? "فشلت العملية وتم استرداد الرصيد إلى محفظتك ❌"
              : "الطلب لا يزال قيد التنفيذ والمعالجة ⏳",
        description: res.message || `حالة الطلب الآن: ${ORDER_STATUS_LABEL[res.new_status] || res.new_status}`,
      });
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.order_ref === orderId)) {
        setSelectedOrder(res.order || { ...selectedOrder, status: res.new_status });
      }
      await refreshAll(true);
    } catch (e: any) {
      toast({ title: "خطأ في التحديث", description: e?.message });
    } finally {
      setSyncingOrderId(null);
    }
  };

  const refreshAllRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);
  refreshAllRef.current = refreshAll;

  const selectedOrderRef = useRef(selectedOrder);
  selectedOrderRef.current = selectedOrder;

  // Stable, leak-proof live wallet & orders polling without recreating timer on every state change
  useEffect(() => {
    if (!store.accessToken || !store.merchant) return;

    const hasPendingOrders = (dash?.orders || []).some((o: any) =>
      ["processing", "pending", "incomplete"].includes(o.status),
    );
    const isModalPending = selectedOrder && ["processing", "pending", "incomplete"].includes(selectedOrder.status);

    // Fast polling only if there are active in-progress orders, otherwise calm 30s
    const pollInterval = isModalPending ? 1000 : hasPendingOrders ? 2500 : 30000;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const currentModalOrder = selectedOrderRef.current;
        if (currentModalOrder && ["processing", "pending", "incomplete"].includes(currentModalOrder.status)) {
          const freshTok = (await getFreshAuthToken()) || store.accessToken;
          if (freshTok) {
            const res = await merchantSyncOrderWithFazerApi(freshTok, {
              order_id: currentModalOrder.id || currentModalOrder.order_ref,
            });
            if (res?.new_status && res.new_status !== currentModalOrder.status) {
              setSelectedOrder(res.order || { ...currentModalOrder, status: res.new_status });
            }
          }
        }
        if (refreshAllRef.current) {
          await refreshAllRef.current(true);
        }
      } catch {
        // Ignore background tick failure
      } finally {
        inFlight = false;
      }
    };

    const interval = setInterval(tick, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [store.accessToken, store.merchant, (dash?.orders || []).length, !!selectedOrder]);

  const signIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("meto_saved_merchant_email", email.trim());
        } else {
          localStorage.removeItem("meto_saved_merchant_email");
        }
      }

      const authRes = await loginWithPasswordApi(email, password);
      if (authRes?.success && authRes?.accessToken) {
        const sessionMeta = {
          refreshToken: authRes.refreshToken,
          expiresAt: authRes.expiresAt,
          email: authRes.user?.email,
        };

        if (authRes.merchant) {
          // Immediately authenticate and switch to the merchant dashboard!
          store.setAuth(authRes.accessToken, authRes.profile, authRes.merchant, sessionMeta, rememberMe);
          toast({ title: "تم تسجيل الدخول بنجاح" });
          // Fetch full dashboard data in background
          loadDashboard(authRes.accessToken, sessionMeta, rememberMe).catch(() => {});
          return;
        }

        const d = await loadDashboard(authRes.accessToken, sessionMeta, rememberMe);
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
        await loadDashboard(
          token,
          {
            refreshToken: data.session?.refresh_token,
            expiresAt: data.session?.expires_at,
            email: data.session?.user?.email,
          },
          rememberMe,
        );
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
      const entry = (store.merchant?.custom_prices as any)?.[p.offerId];
      const customUsd =
        typeof entry === "object" && entry !== null && typeof entry.price_usd === "number"
          ? entry.price_usd
          : typeof entry === "number" && entry > 0
            ? entry
            : null;
      const isCustom = typeof customUsd === "number" && customUsd > 0;
      const base = p.merchantBasePriceEgp ?? p.retailPriceEgp;
      const priceEgp = isCustom
        ? round3(customUsd * store.settings.egp_rate)
        : calcMerchantUnitPriceEgp(base, marginPercent, p.costUsd, store.settings.egp_rate);
      const converted = calcConvertedPrice(
        priceEgp,
        store.settings.egp_rate,
        currencyRate,
        currencyInfo.decimals,
        p.costUsd,
        marginPercent,
      );
      return { priceEgp, converted, isCustom };
    },
    [store.merchant?.custom_prices, marginPercent, store.settings.egp_rate, currencyRate, currencyInfo.decimals],
  );

  const rawBalanceUsd = dash?.stats?.balance_usd ?? store.merchant?.balance_usd ?? Number(store.merchant?.balance_egp || 0);
  const rawBalanceEgp = rawBalanceUsd;
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

  const gameServersList = useMemo(() => getGameServers(selectedGameId), [selectedGameId]);

  const effectivePkgRegion = useMemo(() => {
    if (gameServersList.some((s) => s.code.toLowerCase() === selectedPkgRegion.toLowerCase())) {
      return selectedPkgRegion.toLowerCase();
    }
    return gameServersList[0]?.code || "global";
  }, [gameServersList, selectedPkgRegion]);

  const pkgs = useMemo(() => {
    return filterPackagesForServer(gamePackages, effectivePkgRegion, pkgSearch);
  }, [gamePackages, effectivePkgRegion, pkgSearch]);

  // All merchants operate in 100% Native USD
  const isUsdMerchant = true;
  const cartCount = store.cart.reduce((s, i) => s + i.qty, 0);
  const cartTotalEgp = round3(store.cart.reduce((s, i) => s + i.qty * getMerchantPrices(i.package).priceEgp, 0));
  const cartTotalConverted = round3(store.cart.reduce((s, i) => s + i.qty * getMerchantPrices(i.package).converted, 0));
  const cartTotal = cartTotalEgp;

  const gameRegions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const p of store.packages) {
      if (!p.active) continue;
      const g = p.gameId || "mlbb";
      const r = (Array.isArray(p.regions) && p.regions[0]) || (g === "freefire" ? "mena" : "global");
      if (!map[g]) map[g] = [];
      if (!map[g]!.includes(r)) map[g]!.push(r);
    }
    return map;
  }, [store.packages]);

  const cartRegions = useMemo(() => {
    const set = new Set<string>();
    for (const item of store.cart) {
      const p = item.package;
      const r = (Array.isArray(p.regions) && p.regions[0]) || (p.gameId === "freefire" ? "mena" : "global");
      if (r) set.add(r.toUpperCase());
    }
    return Array.from(set).join(", ");
  }, [store.cart]);

  return (
    <div className="min-h-screen min-h-dvh bg-[#070913] text-slate-100 flex flex-col font-sans flex-1">
      <Navbar />
      <main className={`mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full flex-1 py-5 sm:py-6 space-y-5 sm:space-y-6 ${store.cart.length > 0 ? "pb-24 sm:pb-28" : "pb-8 sm:pb-12"}`}>
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
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <span>تذكرني على هذا الجهاز (Remember me)</span>
                </label>
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
              يتم إنشاء وتفعيل حسابات التجار وتعبئة الأرصدة مباشرة عبر إدارة المنصة.
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
                    ${formatDecimals3(rawBalanceUsd)} <span className="text-xs font-sans">USD</span>
                  </div>
                  <div className="text-[11px] text-emerald-400/90 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>محفظة بالدولار الصافي 💵</span>
                  </div>
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
                    const servers = getGameServers(g.id);
                    const serverSummary = servers.slice(0, 3).map((s) => s.code.toUpperCase()).join(" / ") + (servers.length > 3 ? "..." : "");
                    return (
                      <button
                        key={g.id}
                        onClick={() => {
                          setSelectedGameId(g.id);
                          const defReg = servers[0]?.code || "global";
                          setSelectedPkgRegion(defReg);
                          store.setPlayer({ ...store.player, region: defReg });
                        }}
                        className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 sm:p-3 text-xs font-bold transition-all ${active
                          ? "border-purple-500 bg-purple-500/20 text-purple-200 shadow-sm"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                          }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-1.5 truncate">
                            <Gamepad2 className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                            <span className="truncate">{g.label}</span>
                          </span>
                          <span className="font-mono text-[11px] rounded bg-slate-950/70 px-1.5 py-0.5 text-cyan-300">
                            {gameCounts[g.id] ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between w-full pt-1 border-t border-slate-800/60 text-[10px]">
                          <span className="text-slate-400 font-normal">السيرفرات:</span>
                          <span className="font-mono font-bold text-amber-300 uppercase">{serverSummary}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-purple-500/25 bg-purple-950/20 p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-purple-200 font-semibold">
                      <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>اختر سيرفر / منطقة الشحن (Server Region):</span>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-300 uppercase font-bold">
                      السيرفر النشط: {getServerLabel(effectivePkgRegion, selectedGameId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {gameServersList.map((srv) => {
                      const active = effectivePkgRegion === srv.code.toLowerCase();
                      const pkgCount = gamePackages.filter((p) => {
                        const regs = Array.isArray(p.regions) && p.regions.length
                          ? p.regions.map((r) => String(r).toLowerCase())
                          : ["global"];
                        return regs.includes(srv.code.toLowerCase()) || regs.includes("global");
                      }).length;
                      return (
                        <button
                          key={srv.code}
                          onClick={() => {
                            setSelectedPkgRegion(srv.code);
                            store.setPlayer({ ...store.player, region: srv.code });
                          }}
                          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                            active
                              ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 border border-purple-400"
                              : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span>{srv.labelAr}</span>
                          <span className={`text-[10px] font-mono px-1 rounded ${active ? "bg-purple-800 text-purple-100" : "bg-slate-950 text-slate-400"}`}>
                            ({pkgCount})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {pkgs.slice(0, 60).map((p, idx) => {
                    const prices = getMerchantPrices(p);
                    const pkgRawReg = (Array.isArray(p.regions) && p.regions[0]) || "";
                    const pkgRegion = pkgRawReg && pkgRawReg !== "global" ? pkgRawReg : effectivePkgRegion;
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
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="text-xs sm:text-sm font-semibold text-white truncate">{p.name}</span>
                              <span className="rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 text-[9px] font-mono uppercase font-bold shrink-0">
                                {pkgRegion.toUpperCase()}
                              </span>
                              {Boolean(p.raw?.["is_composite"]) && (
                                <span className="rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 text-[9px] font-bold shrink-0">
                                  مجمعة
                                </span>
                              )}
                              {prices.isCustom && (
                                <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 text-[9px] font-bold shrink-0">
                                  سعر خاص
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>سيرفر: <strong className="text-slate-300 uppercase">{pkgRegion}</strong></span>
                              {p.diamonds > 0 && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-slate-300 font-bold">{p.diamonds} ماسة</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-left">
                            <div className="text-[10px] text-slate-400">السعر:</div>
                            {currencyInfo.currency === "EGP" ? (
                              <div className="text-xs sm:text-sm font-extrabold text-purple-300 font-mono">
                                {formatDecimals3(prices.priceEgp)} ج.م
                              </div>
                            ) : (
                              <div>
                                <div className="text-xs sm:text-sm font-extrabold text-purple-300 font-mono">
                                  {formatDecimals3(prices.converted)} {currencyInfo.symbolAr}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ({formatDecimals3(prices.priceEgp)} ج.م)
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0 bg-purple-600 hover:bg-purple-500 text-white"
                            onClick={() => {
                              store.setPlayer({ ...store.player, region: effectivePkgRegion });
                              store.addToCart(p);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {pkgs.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400">
                      لا توجد باقات متاحة حالياً لهذه اللعبة. قم بتحديث الباقات من لوحة الإدارة.
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={80}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div id="merchant-orders-board" className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-4 scroll-mt-20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base">آخر الطلبات</h3>
                      {(dash?.orders || []).some((o: any) => ["processing", "pending"].includes(o.status)) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>مزامنة تلقائية لحظية ⚡</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">انقر لعرض الفاتورة</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-auto text-xs">
                    {(dash?.orders || []).slice(0, 30).map((o: any) => (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2 p-2 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          {/* Clean Status Icon */}
                          <div className="shrink-0">
                            {o.status === "success" && (
                              <div title="مكتمل بنجاح" className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            )}
                            {o.status === "failed" && (
                              <div title="فشل الشحن" className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                <XCircle className="w-4 h-4" />
                              </div>
                            )}
                            {["processing", "pending"].includes(o.status) && (
                              <div title="قيد التنفيذ والمعالجة" className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                <Clock className="w-4 h-4 animate-spin" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-bold text-xs">
                              <span>#{o.order_ref}</span>
                              {["processing", "pending"].includes(o.status) && (
                                <span className="text-[10px] text-amber-400 font-normal animate-pulse">● قيد التنفيذ</span>
                              )}
                            </div>
                            {/* Recharged package details (e.g. 514 Diamonds / 429 💎 / Weekly Pass) */}
                            {Array.isArray(o.items) && o.items.length > 0 && (
                              <div className="text-xs font-semibold text-purple-200 truncate mt-0.5 flex items-center gap-1">
                                <Package className="w-3 h-3 text-purple-400 shrink-0" />
                                <span className="truncate">
                                  {o.items.map((it: any) => `${it.qty > 1 ? `${it.qty}x ` : ""}${it.name}`).join(" + ")}
                                </span>
                                {o.items.some((it: any) => Number(it.diamonds) > 0) && (
                                  <span className="text-emerald-400 font-mono text-[10px] shrink-0 font-bold">
                                    ({o.items.reduce((s: number, it: any) => s + (Number(it.diamonds || 0) + Number(it.bonus_diamonds || 0)) * (it.qty || 1), 0)} 💎)
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-slate-400 text-[11px] truncate mt-0.5">
                              ID: {o.player_id} {o.zone_id ? `(${o.zone_id})` : ""} • <span className="uppercase text-slate-300">{o.game_id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="font-mono font-bold text-emerald-400 text-xs">
                            <span>${formatDecimals3(o.total_usd ?? (Number(o.total_egp) / (store.settings.egp_rate || 50)))} USD</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(o.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
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
                      <div key={t.id} className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2 p-1.5">
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="shrink-0">
                            {Number(t.amount) >= 0 ? (
                              <div title="إيداع" className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <ArrowDownLeft className="w-4 h-4" />
                              </div>
                            ) : (
                              <div title="خصم طلب" className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                <ArrowUpRight className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-xs">
                              {LEDGER_TYPE_LABEL[t.entry_type] || t.entry_type}
                            </div>
                            <div className="text-slate-400 text-[10px] truncate">{t.note || t.reference_id || "-"}</div>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <div
                            className={`font-mono font-bold text-xs ${Number(t.amount_usd ?? t.amount) >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                          >
                            <span>
                              {Number(t.amount_usd ?? t.amount) >= 0 ? "+" : ""}${formatDecimals3(Math.abs(t.amount_usd ?? t.amount))} USD
                            </span>
                          </div>
                          <div className="text-slate-500 text-[10px] font-mono">
                            <span>بعدها: ${formatDecimals3(t.balance_after_usd ?? t.balance_after)} USD</span>
                          </div>
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
                <div className="font-bold text-xs sm:text-sm truncate flex items-center gap-1.5">
                  <span>{cartCount} عنصر في السلة</span>
                  {cartRegions && (
                    <span className="text-[10px] bg-purple-950 text-cyan-300 border border-purple-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                      {cartRegions}
                    </span>
                  )}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-300">
                  إجمالي السلة:{" "}
                  {isUsdMerchant ? (
                    <>
                      <span className="text-purple-300 font-bold font-mono">${formatDecimals3(cartTotalConverted)} USD</span>
                      <span className="text-slate-400 font-mono text-[10px] mr-1">({formatDecimals3(cartTotalEgp)} ج.م)</span>
                    </>
                  ) : (
                    <span className="text-purple-300 font-bold font-mono">{formatDecimals3(cartTotalEgp)} ج.م</span>
                  )}
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

      <Footer className={store.cart.length > 0 ? "pb-20 md:pb-0" : ""} />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={store.cart}
        onUpdateQty={store.updateCartQty}
        onRemove={store.removeFromCart}
        onClear={store.clearCart}
        onOrderSuccess={() => refreshAll(true)}
      />

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-gradient-to-b from-[#0f172a] to-[#0a0f1d] p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Invoice Top Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white">فاتورة شحن إلكترونية</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    METO STORE
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono mt-0.5">
                  <span>رقم الفاتورة:</span>
                  <span className="text-cyan-300 font-bold">{selectedOrder.order_ref}</span>
                  <CopyButton text={selectedOrder.order_ref} />
                </div>
                {/* Quick package summary pill in invoice header */}
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-200 font-semibold">
                      <Package className="w-3 h-3 text-purple-400" />
                      <span>{selectedOrder.items.map((it: any) => `${it.qty > 1 ? `${it.qty}x ` : ""}${it.name}`).join(" + ")}</span>
                    </span>
                    {selectedOrder.items.some((it: any) => Number(it.diamonds) > 0) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono font-bold">
                        💎 {selectedOrder.items.reduce((s: number, it: any) => s + (Number(it.diamonds || 0) + Number(it.bonus_diamonds || 0)) * (it.qty || 1), 0)} جوهرة
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status Banner with Clean Icon */}
            <div
              className={`rounded-xl p-3 mb-4 flex items-center justify-between border ${
                selectedOrder.status === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : selectedOrder.status === "failed"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {selectedOrder.status === "success" && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                {selectedOrder.status === "failed" && (
                  <div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                )}
                {selectedOrder.status === "processing" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold">
                    {selectedOrder.status === "success"
                      ? "تم اكتمال الشحن بنجاح"
                      : selectedOrder.status === "failed"
                        ? "تعذر تنفيذ الشحن"
                        : "قيد المعالجة المباشرة في السيرفر"}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {selectedOrder.status === "success"
                      ? "تم تسليم الجواهر إلى حساب اللاعب مباشرة"
                      : selectedOrder.status === "failed"
                        ? "تم استرداد كامل المبلغ إلى محفظتك تلقائياً"
                        : "جاري المتابعة اللحظية حتى اكتمال التنفيذ..."}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {isUsdMerchant ? (
                  <>
                    <span className="font-mono text-xs font-extrabold text-white">
                      ${formatDecimals3(selectedOrder.total_usd ?? (Number(selectedOrder.total_egp) / (store.settings.egp_rate || 50)))} USD
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      ({selectedOrder.total_egp} ج.م)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-xs font-extrabold text-white">
                      {selectedOrder.total_egp} ج.م
                    </span>
                    {selectedOrder.total_usd && (
                      <span className="block text-[10px] text-slate-400 font-mono">
                        (${selectedOrder.total_usd})
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Recharged Packages & Diamonds Card */}
            {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5 mb-4 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-purple-300 border-b border-purple-800/40 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-purple-400" />
                    <span>الباقات المشحونة (تفاصيل الشحنة والجواهر)</span>
                  </span>
                  {selectedOrder.items.some((it: any) => Number(it.diamonds) > 0) && (
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      إجمالي: {selectedOrder.items.reduce((s: number, it: any) => s + (Number(it.diamonds || 0) + Number(it.bonus_diamonds || 0)) * (it.qty || 1), 0)} جوهرة 💎
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  {selectedOrder.items.map((it: any, idx: number) => {
                    const itemDiamonds = (Number(it.diamonds || 0) + Number(it.bonus_diamonds || 0)) * (it.qty || 1);
                    return (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                        <div className="min-w-0">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="text-purple-300 font-mono">{it.qty}x</span>
                            <span>{it.name}</span>
                          </div>
                          {itemDiamonds > 0 ? (
                            <div className="text-[11px] text-emerald-400 font-mono mt-0.5 font-semibold flex items-center gap-1">
                              <span>💎 {itemDiamonds} جوهرة</span>
                              {it.bonus_diamonds > 0 && (
                                <span className="text-amber-300 text-[10px] mr-1">(بونص مضاعف: +{it.bonus_diamonds * (it.qty || 1)})</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-cyan-300 mt-0.5">
                              بطاقة / تصريح معتمد
                            </div>
                          )}
                          {it.is_composite && Array.isArray(it.components) && it.components.length > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              تجميعة: {it.components.map((c: any) => `${c.diamonds}💎`).join(" + ")}
                            </div>
                          )}
                        </div>

                        <div className="text-left shrink-0 font-mono">
                          <span className="font-bold text-emerald-300 text-xs">
                            {isUsdMerchant ? (
                              <span>${formatDecimals3(Number(it.unit_price_usd ?? (Number(it.unit_price_egp) / (store.settings.egp_rate || 50))) * (it.qty || 1))} USD</span>
                            ) : (
                              <span>{(Number(it.unit_price_egp) * (it.qty || 1)).toFixed(3)} ج.م</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invoice Breakdown Details */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 mb-4 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                <span>بيانات الحساب والطلب</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(selectedOrder.created_at).toLocaleString("ar-EG", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">معرف اللاعب (Player ID):</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-white text-xs mt-0.5">
                    <span>{selectedOrder.player_id}</span>
                    <CopyButton text={selectedOrder.player_id} />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">معرف السيرفر (Zone ID):</span>
                  <span className="font-mono font-bold text-slate-200 text-xs block mt-0.5">
                    {selectedOrder.zone_id || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">اللعبة:</span>
                  <span className="font-semibold text-white uppercase text-xs block mt-0.5">
                    {selectedOrder.game_id || "MLBB"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">سيرفر الشحن:</span>
                  <span className="font-semibold text-cyan-300 text-xs block mt-0.5 uppercase">
                    {selectedOrder.region || "Global"}
                  </span>
                </div>
              </div>

              {/* Direct Server Reference ID (No Fazer mention) */}
              {selectedOrder.fazer_transaction_id && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 bg-slate-950/40 p-2 rounded-lg">
                  <span className="text-[11px] text-slate-400">الرقم المرجعي للسيرفر (Ref ID):</span>
                  <div className="flex items-center gap-1 font-mono text-cyan-300 text-xs font-semibold">
                    <span className="truncate max-w-[180px]">{selectedOrder.fazer_transaction_id}</span>
                    <CopyButton text={selectedOrder.fazer_transaction_id} />
                  </div>
                </div>
              )}
            </div>

            {/* Fail Reason Alert if failed */}
            {selectedOrder.status === "failed" && selectedOrder.fail_reason && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 mb-4 text-xs text-rose-300">
                <span className="font-bold block mb-0.5">سبب عدم الاكتمال:</span>
                <span>{selectedOrder.fail_reason}</span>
                <span className="block text-[10px] text-emerald-400 mt-1 font-semibold">
                  ✓ تم إعادة المبلغ كاملاً إلى رصيدك المتاح تلقائياً.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 text-xs px-3"
                onClick={() => setSelectedOrder(null)}
              >
                إغلاق
              </Button>

              <Button
                variant="outline"
                className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 text-xs flex items-center justify-center gap-1.5 flex-1"
                onClick={() => {
                  const statusDesc =
                    selectedOrder.status === "success"
                      ? "تم الشحن بنجاح ✅"
                      : selectedOrder.status === "failed"
                        ? "فشلت وتم استرداد الرصيد ❌"
                        : "قيد المعالجة في السيرفر ⏳";
                  const itemsSummary =
                    Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0
                      ? selectedOrder.items
                          .map((it: any) => {
                            const dia = (Number(it.diamonds || 0) + Number(it.bonus_diamonds || 0)) * (it.qty || 1);
                            return `${it.qty > 1 ? `${it.qty}x ` : ""}${it.name}${dia > 0 ? ` (${dia} جوهرة 💎)` : ""}`;
                          })
                          .join(" + ")
                      : "شحن رصيد";
                  const orderTotalFormatted = isUsdMerchant
                    ? `$${formatDecimals3(selectedOrder.total_usd ?? (Number(selectedOrder.total_egp) / (store.settings.egp_rate || 50)))} USD`
                    : `${selectedOrder.total_egp} ج.م`;
                  const text = `🧾 فاتورة شحن METO STORE\nرقم الطلب: ${selectedOrder.order_ref}\nاللاعب: ${selectedOrder.player_id}${selectedOrder.zone_id ? ` (${selectedOrder.zone_id})` : ""}\nاللعبة: ${(selectedOrder.game_id || "MLBB").toUpperCase()}\nالباقة المشحونة: ${itemsSummary}\nالمبلغ: ${orderTotalFormatted}\nالحالة: ${statusDesc}\nhttps://meto-three.vercel.app`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                }}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>مشاركة الفاتورة</span>
              </Button>

              {["processing", "pending"].includes(selectedOrder.status) ? (
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>مزامنة تلقائية لحظية مع السيرفر ⚡</span>
                </div>
              ) : (
                <Button
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 flex-1"
                  onClick={() => setSelectedOrder(null)}
                >
                  <span>إغلاق</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
