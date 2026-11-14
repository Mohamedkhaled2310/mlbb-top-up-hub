import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Eye,
  History,
  Lock,
  LogOut,
  Package,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
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
  adminDeleteMerchantApi,
  adminGetMerchantDetailsApi,
  adminListMerchantsApi,
  adminListOrdersApi,
  adminSetMarginApi,
  adminSetMerchantBalanceApi,
  adminSetMerchantRegionApi,
  adminSyncBinanceRateApi,
  adminSyncFazerApi,
  adminToggleMerchantApi,
  adminUpdateEgpRateApi,
  adminUpdatePackagePriceApi,
  checkSystemStatusApi,
  getStoreApi,
  loginWithPasswordApi,
  refreshSessionApi,
} from "../lib/api-client";
import { MERCHANT_COUNTRIES, getCountryCurrencyInfo } from "../lib/currency";
import { calcMerchantBasePriceEgp, calcRetailPriceEgp, formatDecimals3, round3 } from "../lib/pricing";
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
  const [pkgSearch, setPkgSearch] = useState<string>("");
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [editCostUsd, setEditCostUsd] = useState<string>("");
  const [editPkgName, setEditPkgName] = useState<string>("");
  const [savingPkg, setSavingPkg] = useState(false);

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
    initialBalanceUsd: "20",
  });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Set Balance Modal
  const [adjustBalance, setAdjustBalance] = useState<{
    merchant: any;
    amountUsd: string;
    amountEgp: string;
    mode: "usd" | "egp";
    note: string;
  } | null>(null);
  const [adjustingBalance, setAdjustingBalance] = useState(false);

  // Delete Merchant Modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletingMerchant, setDeletingMerchant] = useState(false);

  // Merchant Profile Modal
  const [profileMerchantId, setProfileMerchantId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profilePkgSearch, setProfilePkgSearch] = useState("");
  const [profilePkgGame, setProfilePkgGame] = useState("all");
  const [profilePkgServer, setProfilePkgServer] = useState("all");
  const [profileTab, setProfileTab] = useState<"packages" | "ledger" | "orders">("packages");

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
    const usd = Number(credit.amount);
    if (!Number.isFinite(usd) || usd <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح بالدولار ($ USD) أكبر من صفر" });
      return;
    }
    try {
      const r = await adminCreditMerchantApi(token, {
        merchant_id: credit.id,
        amount_usd: usd,
        ...(credit.note.trim() ? { note: credit.note.trim() } : {}),
      });
      if (r?.error) throw new Error(r.error);
      const addedEgp = r?.amount_egp || Math.round(usd * (egpRate || 50) * 100) / 100;
      toast({
        title: "تمت إضافة الرصيد لمحفظة التاجر بنجاح 💵",
        description: `المبلغ: $${usd} USD (يعادل ${addedEgp} ج.م بسعر ${egpRate} ج.م/$)`,
      });
      setCredit(null);
      await loadMerchants(token, mPage, mQuery);
    } catch (e: any) {
      toast({ title: "فشل إضافة الرصيد", description: e?.message });
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
            initialBalanceUsd: 20,
          }
        : {
            email: newMerchant.email.trim(),
            password: newMerchant.password.trim(),
            fullName: newMerchant.fullName.trim() || "تاجر معتمد",
            phone: newMerchant.phone.trim(),
            region: newMerchant.region || "EG",
            marginPercent: Number(newMerchant.marginPercent || 0),
            initialBalanceUsd: Number(newMerchant.initialBalanceUsd || 0),
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
        initialBalanceUsd: "20",
      });
      const egpEquivalent = Math.round(payload.initialBalanceUsd * (egpRate || 50) * 100) / 100;
      toast({
        title: "تم إنشاء وتفعيل حساب التاجر بنجاح",
        description: `${payload.email} • رصيد افتتاحي: $${payload.initialBalanceUsd} (${egpEquivalent} ج.م)`,
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

  const openAdjustBalance = (m: any) => {
    const curEgp = Number(m.balance_egp || 0);
    const curUsd = (curEgp / (egpRate || 50)).toFixed(2);
    setAdjustBalance({
      merchant: m,
      amountUsd: curUsd,
      amountEgp: String(curEgp),
      mode: "usd",
      note: "",
    });
  };

  const submitAdjustBalance = async () => {
    if (!token || !adjustBalance) return;
    setAdjustingBalance(true);
    try {
      const payload: any = {
        merchant_id: adjustBalance.merchant.id,
        note: adjustBalance.note.trim() || undefined,
      };
      if (adjustBalance.mode === "usd") {
        payload.balance_usd = Number(adjustBalance.amountUsd);
      } else {
        payload.balance_egp = Number(adjustBalance.amountEgp);
      }
      const res = await adminSetMerchantBalanceApi(token, payload);
      if (res?.error) throw new Error(res.error);
      toast({
        title: "تم تعديل رصيد التاجر بنجاح",
        description: `الرصيد الجديد: $${res.balance_usd} (${Number(res.balance_egp).toLocaleString("en-US")} ج.م)`,
      });
      setAdjustBalance(null);
      await loadMerchants(token, mPage, mQuery);
    } catch (e: any) {
      toast({ title: "فشل تعديل الرصيد", description: e?.message });
    } finally {
      setAdjustingBalance(false);
    }
  };

  const openDeleteMerchant = (m: any) => {
    setDeleteTarget(m);
  };

  const submitDeleteMerchant = async () => {
    if (!token || !deleteTarget) return;
    setDeletingMerchant(true);
    try {
      const res = await adminDeleteMerchantApi(token, { merchant_id: deleteTarget.id });
      if (res?.error) throw new Error(res.error);
      toast({
        title: "تم حذف حساب التاجر بنجاح",
        description: `تم إزالة التاجر ${deleteTarget.profile?.full_name || deleteTarget.email} بنجاح`,
      });
      setDeleteTarget(null);
      if (profileMerchantId === deleteTarget.id) {
        setProfileMerchantId(null);
        setProfileData(null);
      }
      await loadMerchants(token, mPage, mQuery);
    } catch (e: any) {
      toast({ title: "فشل حذف التاجر", description: e?.message });
    } finally {
      setDeletingMerchant(false);
    }
  };

  const openMerchantProfile = async (merchantId: string) => {
    if (!token) return;
    setProfileMerchantId(merchantId);
    setProfileLoading(true);
    setProfileData(null);
    setProfileTab("packages");
    try {
      const res = await adminGetMerchantDetailsApi(token, merchantId);
      if (res?.error) throw new Error(res.error);
      setProfileData(res);
    } catch (e: any) {
      toast({ title: "تعذر تحميل بروفايل التاجر", description: e?.message });
      setProfileMerchantId(null);
    } finally {
      setProfileLoading(false);
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

  const openEditPkg = (p: any) => {
    setEditingPkg(p);
    setEditCostUsd(String(p.costUsd || ""));
    setEditPkgName(p.name || "");
  };

  const submitPackagePrice = async () => {
    if (!token || !editingPkg) return;
    const cost = Number(editCostUsd);
    if (!Number.isFinite(cost) || cost <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال سعر تكلفة صحيح بالدولار أكبر من صفر" });
      return;
    }
    setSavingPkg(true);
    try {
      const res = await adminUpdatePackagePriceApi(token, {
        offerId: editingPkg.offerId || editingPkg.id,
        costUsd: cost,
        ...(editPkgName.trim() ? { name: editPkgName.trim() } : {}),
      });
      if (res?.error) throw new Error(res.error);
      toast({
        title: "تم تعديل وحفظ سعر الباقة بنجاح",
        description: `${editingPkg.name} • التكلفة: $${cost}`,
      });
      setEditingPkg(null);
      await loadStore();
    } catch (e: any) {
      toast({ title: "فشل تعديل السعر", description: e?.message });
    } finally {
      setSavingPkg(false);
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
    let list = store.packages;
    if (pkgGameFilter !== "all") {
      list = list.filter((p) => (p.gameId || "mlbb") === pkgGameFilter);
    }
    if (pkgSearch.trim()) {
      const q = pkgSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.offerId || "").toLowerCase().includes(q) ||
          (p.gameId || "").toLowerCase().includes(q) ||
          String(p.diamonds || "").includes(q),
      );
    }
    return list;
  }, [store.packages, pkgGameFilter, pkgSearch]);

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
              <div className="rounded-2xl border border-slate-800 bg-[#0a0f20] p-3.5 sm:p-5 space-y-4">
                {/* Section Header & Controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold flex items-center gap-2 text-sm sm:text-base text-white">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>قائمة التجار</span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 font-mono">
                        صفحة {mPage} من {mTotalPages}
                      </span>
                    </h2>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Search bar */}
                    <div className="flex items-center gap-1.5 flex-1 max-w-md">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <Input
                          placeholder="بحث بالاسم، البريد، أو الهاتف..."
                          value={mQuery}
                          onChange={(e) => setMQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && token) loadMerchants(token, 1, mQuery);
                          }}
                          className={`w-full pr-8 pl-3 h-9 text-xs ${DARK_INPUT}`}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 h-9 shrink-0 px-3 text-xs"
                        onClick={() => token && loadMerchants(token, 1, mQuery)}
                      >
                        بحث
                      </Button>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-9 text-xs shadow-sm shadow-purple-900/30"
                        onClick={() => setCreateOpen(true)}
                      >
                        <UserPlus className="w-3.5 h-3.5 ml-1" /> إضافة تاجر
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={creatingMerchant}
                        className="border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 h-9 text-xs truncate"
                        onClick={() => handleCreateMerchant(true)}
                      >
                        <Sparkles className="w-3.5 h-3.5 ml-1" /> {creatingMerchant ? "جارٍ الإنشاء..." : "تجريبي ($20)"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 1) Desktop / Tablet Table View (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs min-w-[760px]">
                    <thead className="bg-[#0e1428] text-slate-300">
                      <tr>
                        <th className="p-3 text-right">التاجر</th>
                        <th className="p-3">الجنسية / العملة</th>
                        <th className="p-3">الرصيد ($ USD / ج.م)</th>
                        <th className="p-3">هامش ربح الأدمن %</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {merchants.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => openMerchantProfile(m.id)}
                              className="text-right hover:text-purple-300 transition-colors group block"
                              title="انقر لفتح بروفايل التاجر الشامل"
                            >
                              <div className="font-semibold text-white group-hover:text-purple-300 flex items-center gap-1.5">
                                <span>{m.profile?.full_name || "—"}</span>
                                <Eye className="w-3 h-3 text-slate-500 group-hover:text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="text-slate-400 font-mono text-[11px]">
                                {m.email || m.profile?.phone || m.user_id}
                              </div>
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <select
                              value={m.profile?.region || "EG"}
                              onChange={(e) => handleChangeMerchantRegion(m.id, e.target.value)}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-purple-400 cursor-pointer"
                              title="تغيير جنسية التاجر والعملة"
                            >
                              {MERCHANT_COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.labelAr} ({c.currency})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-center font-mono">
                            <div className="font-bold text-emerald-300 text-sm">
                              ${formatDecimals3(Number(m.balance_egp || 0) / (egpRate || 50))}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatDecimals3(m.balance_egp)} ج.م
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-purple-300">+{m.margin_percent}%</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                m.is_active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {m.is_active ? "مفعل" : "موقوف"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-purple-500/40 bg-purple-950/30 text-purple-200 hover:bg-purple-900/50"
                                onClick={() => openMerchantProfile(m.id)}
                                title="عرض بروفايل التاجر والأسعار المخصصة"
                              >
                                <Eye className="w-3.5 h-3.5" /> البروفايل
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-600/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50"
                                onClick={() => openAdjustBalance(m)}
                                title="تعديل الرصيد المباشر"
                              >
                                <Sliders className="w-3.5 h-3.5" /> تعديل الرصيد
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-600/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/60 font-semibold"
                                onClick={() => setCredit({ id: m.id, amount: "", note: "" })}
                                title="إيداع رصيد إضافي بالدولار"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> شحن +
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                                onClick={() => setMarginEdit({ id: m.id, value: String(m.margin_percent || 0) })}
                                title="تعديل نسبة هامش ربح الأدمن"
                              >
                                الهامش
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className={`border-slate-700 ${
                                  m.is_active
                                    ? "bg-slate-800 text-amber-300 hover:bg-amber-950/40"
                                    : "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50"
                                }`}
                                onClick={() => toggleMerchantActive(m)}
                                title={m.is_active ? "إيقاف التاجر مؤقتاً" : "تفعيل التاجر"}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-rose-700/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-white"
                                onClick={() => openDeleteMerchant(m)}
                                title="حذف حساب التاجر مع رسالة تأكيد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

                {/* 2) Mobile Responsive Cards View (visible strictly on mobile screens < md) */}
                <div className="block md:hidden space-y-3">
                  {merchants.map((m: any) => {
                    const balanceUsd = formatDecimals3(Number(m.balance_egp || 0) / (egpRate || 50));
                    const balanceEgp = formatDecimals3(m.balance_egp);
                    const merchantInitial = (m.profile?.full_name || m.email || "M").trim().charAt(0).toUpperCase();

                    return (
                      <div
                        key={m.id}
                        className="rounded-2xl border border-slate-800 bg-[#0d1326] p-3.5 space-y-3 shadow-md hover:border-purple-500/40 transition-all"
                      >
                        {/* Card Header: Avatar + Info + Status */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-sm text-purple-300 shrink-0">
                              {merchantInitial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => openMerchantProfile(m.id)}
                                className="text-right font-bold text-white hover:text-purple-300 transition-colors flex items-center gap-1.5 max-w-full"
                              >
                                <span className="truncate">{m.profile?.full_name || "تاجر بدون اسم"}</span>
                                <Eye className="w-3.5 h-3.5 text-purple-400 shrink-0 opacity-80" />
                              </button>
                              <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                                {m.email || m.profile?.phone || m.user_id}
                              </div>
                              {m.profile?.phone && m.email && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {m.profile.phone}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                m.is_active
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                  : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                              }`}
                            >
                              {m.is_active ? "مفعل" : "موقوف"}
                            </span>
                          </div>
                        </div>

                        {/* Card Key Metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-[#080c1b] border border-slate-800/80 rounded-xl p-2.5 text-center">
                          {/* Balance */}
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-slate-400">الرصيد</div>
                            <div className="font-extrabold text-emerald-300 font-mono text-sm leading-tight">
                              ${balanceUsd}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono leading-tight">
                              {balanceEgp} ج.م
                            </div>
                          </div>

                          {/* Admin Margin */}
                          <div className="space-y-0.5 border-x border-slate-800 px-1">
                            <div className="text-[10px] text-slate-400">هامش الأدمن</div>
                            <div className="font-extrabold text-purple-300 font-mono text-sm leading-tight">
                              +{m.margin_percent || 0}%
                            </div>
                            <button
                              type="button"
                              onClick={() => setMarginEdit({ id: m.id, value: String(m.margin_percent || 0) })}
                              className="text-[9px] text-purple-400 hover:text-purple-300 underline leading-tight block mx-auto"
                            >
                              تعديل
                            </button>
                          </div>

                          {/* Nationality & Currency */}
                          <div className="space-y-0.5 flex flex-col justify-center">
                            <div className="text-[10px] text-slate-400">الدولة / العملة</div>
                            <select
                              value={m.profile?.region || "EG"}
                              onChange={(e) => handleChangeMerchantRegion(m.id, e.target.value)}
                              className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[10px] text-white outline-none focus:border-purple-400 w-full text-center cursor-pointer"
                              title="تغيير جنسية التاجر والعملة"
                            >
                              {MERCHANT_COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.labelAr} ({c.currency})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Primary Touch Actions */}
                        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-emerald-600/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/60 font-semibold flex items-center justify-center gap-1"
                            onClick={() => setCredit({ id: m.id, amount: "", note: "" })}
                          >
                            <DollarSign className="w-3.5 h-3.5" /> شحن +
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-cyan-600/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 flex items-center justify-center gap-1"
                            onClick={() => openAdjustBalance(m)}
                          >
                            <Sliders className="w-3.5 h-3.5" /> الرصيد
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-purple-500/40 bg-purple-950/30 text-purple-200 hover:bg-purple-900/50 flex items-center justify-center gap-1"
                            onClick={() => openMerchantProfile(m.id)}
                          >
                            <Eye className="w-3.5 h-3.5" /> البروفايل
                          </Button>
                        </div>

                        {/* Secondary Actions Bar */}
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80 text-xs">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                            onClick={() => setMarginEdit({ id: m.id, value: String(m.margin_percent || 0) })}
                          >
                            <Pencil className="w-3 h-3 text-purple-400 ml-1" /> ضبط الهامش
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 px-2 text-[11px] ${
                                m.is_active
                                  ? "text-amber-300 hover:bg-amber-950/30"
                                  : "text-emerald-300 hover:bg-emerald-950/30"
                              }`}
                              onClick={() => toggleMerchantActive(m)}
                              title={m.is_active ? "إيقاف التاجر مؤقتاً" : "تفعيل التاجر"}
                            >
                              <Power className="w-3 h-3 ml-1" />
                              {m.is_active ? "إيقاف" : "تفعيل"}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-rose-300 hover:bg-rose-950/30 hover:text-rose-200"
                              onClick={() => openDeleteMerchant(m)}
                              title="حذف حساب التاجر"
                            >
                              <Trash2 className="w-3 h-3 ml-1" /> حذف
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {merchants.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400 space-y-2">
                      <Users className="w-8 h-8 text-slate-600 mx-auto" />
                      <div>لا يوجد تجار مسجلون يطابقون البحث</div>
                      <div className="text-[11px] text-slate-500">اضغط "إضافة تاجر جديد" أو "توليد تاجر تجريبي" للبدء.</div>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs border-t border-slate-800/80">
                  <div className="text-slate-400 text-center sm:text-right">
                    عرض صفحة <span className="font-mono font-bold text-white">{mPage}</span> من إجمالي{" "}
                    <span className="font-mono font-bold text-white">{mTotalPages}</span> صفحة
                  </div>
                  <div className="flex items-center justify-center gap-1.5 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 h-8 px-3 text-xs flex-1 sm:flex-initial"
                      disabled={mPage <= 1}
                      onClick={() => token && loadMerchants(token, mPage - 1, mQuery)}
                    >
                      السابق
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, mTotalPages) }, (_, i) => {
                        let p = i + 1;
                        if (mTotalPages > 5) {
                          if (mPage > 3) p = mPage - 2 + i;
                          if (p > mTotalPages) p = mTotalPages - (4 - i);
                        }
                        return (
                          <button
                            key={p}
                            onClick={() => token && loadMerchants(token, p, mQuery)}
                            className={`h-8 w-8 rounded-lg text-xs font-mono font-bold transition-colors ${
                              p === mPage
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 h-8 px-3 text-xs flex-1 sm:flex-initial"
                      disabled={mPage >= mTotalPages}
                      onClick={() => token && loadMerchants(token, mPage + 1, mQuery)}
                    >
                      التالي
                    </Button>
                  </div>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <h2 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                  <Package className="w-4 h-4 text-cyan-400" /> الباقات المتزامنة ({filteredAdminPackages.length})
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="بحث بالاسم أو الكود..."
                      value={pkgSearch}
                      onChange={(e) => setPkgSearch(e.target.value)}
                      className={`pr-8 h-8 text-xs ${DARK_INPUT}`}
                    />
                  </div>
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
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[420px]">
                <table className="w-full text-xs min-w-[760px]">
                  <thead className="bg-[#0e1428] text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2.5 text-right">اللعبة</th>
                      <th className="p-2.5 text-right">الباقة</th>
                      <th className="p-2.5">Offer ID</th>
                      <th className="p-2.5">تكلفة $</th>
                      <th className="p-2.5">سعر البيع (ج.م)</th>
                      <th className="p-2.5">أساس التاجر (ج.م)</th>
                      <th className="p-2.5">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredAdminPackages.slice(0, 200).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/40">
                        <td className="p-2.5 text-right uppercase font-bold text-slate-300">{p.gameId}</td>
                        <td className="p-2.5 text-right text-white font-medium">{p.name}</td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">{p.offerId}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-amber-300">${p.costUsd || 0}</td>
                        <td className="p-2.5 text-center font-mono text-emerald-300">{p.retailPriceEgp} ج.م</td>
                        <td className="p-2.5 text-center font-mono text-purple-300">{p.merchantBasePriceEgp} ج.م</td>
                        <td className="p-2.5 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/60 font-semibold gap-1"
                            onClick={() => openEditPkg(p)}
                          >
                            <Pencil className="w-3 h-3" /> تعديل
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredAdminPackages.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          لا توجد باقات مطابقة للبحث أو الفلتر.
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
                <label className="text-slate-300 font-semibold">هامش ربح الأدمن % (فوق التكلفة)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={newMerchant.marginPercent}
                  onChange={(e) => setNewMerchant((s) => ({ ...s, marginPercent: e.target.value }))}
                  className={`mt-1 font-mono ${DARK_INPUT}`}
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold">رصيد افتتاحي ($ USD)</label>
                <Input
                  type="number"
                  step="any"
                  value={newMerchant.initialBalanceUsd}
                  onChange={(e) => setNewMerchant((s) => ({ ...s, initialBalanceUsd: e.target.value }))}
                  className={`mt-1 font-mono ${DARK_INPUT}`}
                />
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  ≈ {(Math.round((Number(newMerchant.initialBalanceUsd) || 0) * (egpRate || 50) * 100) / 100).toLocaleString("en-US")} ج.م
                </div>
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
            <DialogTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> شحن رصيد تاجر بالدولار ($ USD)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-semibold mb-1 block">المبلغ بالدولار ($ USD) *</label>
              <Input
                type="number"
                step="any"
                placeholder="مثال: 50"
                value={credit?.amount || ""}
                onChange={(e) => setCredit((c) => (c ? { ...c, amount: e.target.value } : c))}
                className={`font-mono text-base ${DARK_INPUT}`}
                autoFocus
              />
            </div>

            {/* Live conversion preview */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span>سعر الدولار المعتمد:</span>
                <span className="font-mono font-bold text-amber-300">{egpRate} ج.م / $</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>المعادل المضاف للمحفظة:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {credit?.amount && Number(credit.amount) > 0
                    ? (Math.round(Number(credit.amount) * (egpRate || 50) * 100) / 100).toLocaleString("en-US")
                    : "0"}{" "}
                  ج.م
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold mb-1 block">ملاحظة المعاملة (اختياري)</label>
              <Input
                placeholder="مثال: شحن رصيد بالدولار عن طريق باينانس"
                value={credit?.note || ""}
                onChange={(e) => setCredit((c) => (c ? { ...c, note: e.target.value } : c))}
                className={DARK_INPUT}
              />
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              disabled={!credit?.amount || Number(credit.amount) <= 0}
              onClick={submitCredit}
            >
              تأكيد شحن ${Number(credit?.amount || 0)} USD
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Margin Modal */}
      <Dialog open={!!marginEdit} onOpenChange={(o) => !o && setMarginEdit(null)}>
        <DialogContent className="max-w-sm bg-[#0a0f20] border border-slate-700 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">تعديل هامش ربح الأدمن (%)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            <p className="text-[11px] text-slate-400">
              نسبة الربح التي يربحها المتجر فوق سعر التكلفة من طلبات هذا التاجر (مثال: 5 تعني بيع الباقة بسعر التكلفة + 5%).
            </p>
            <Input
              type="number"
              step="0.5"
              placeholder="هامش ربح الأدمن %"
              value={marginEdit?.value || ""}
              onChange={(e) => setMarginEdit((m) => (m ? { ...m, value: e.target.value } : m))}
              className={DARK_INPUT}
            />
            <Button className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold" onClick={submitMargin}>
              حفظ الهامش
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Package Price Modal */}
      <Dialog open={!!editingPkg} onOpenChange={(o) => !o && setEditingPkg(null)}>
        <DialogContent className="max-w-md bg-[#0a0f20] border border-cyan-500/40 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="w-4 h-4 text-cyan-400" /> تعديل سعر وتفاصيل الباقة
            </DialogTitle>
          </DialogHeader>
          {editingPkg && (
            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{editingPkg.name}</span>
                  <span className="uppercase font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded text-[10px] border border-cyan-500/30">
                    {editingPkg.gameId}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Offer ID: <span className="text-slate-300">{editingPkg.offerId}</span>
                </div>
                {editingPkg.diamonds > 0 && (
                  <div className="text-[11px] text-slate-400">
                    القيمة: <b className="text-amber-300">{editingPkg.diamonds}</b> ماسة / شدة
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  سعر التكلفة الأساسي بالدولار ($ USD) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="مثال: 1.33"
                  value={editCostUsd}
                  onChange={(e) => setEditCostUsd(e.target.value)}
                  className={`font-mono text-sm ${DARK_INPUT}`}
                />
              </div>

              {/* Live preview of retail and merchant prices */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-center">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-400">سعر البيع للجمهور (+15%):</div>
                  <div className="text-sm font-black font-mono text-emerald-300">
                    {calcRetailPriceEgp(Number(editCostUsd) || 0, egpRate)} ج.م
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-400">أساس سعر التجار (+5%):</div>
                  <div className="text-sm font-black font-mono text-purple-300">
                    {calcMerchantBasePriceEgp(Number(editCostUsd) || 0, egpRate)} ج.م
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  اسم الباقة (اختياري)
                </label>
                <Input
                  type="text"
                  value={editPkgName}
                  onChange={(e) => setEditPkgName(e.target.value)}
                  placeholder="اسم الباقة"
                  className={DARK_INPUT}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  onClick={() => setEditingPkg(null)}
                >
                  إلغاء
                </Button>
                <Button
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                  onClick={submitPackagePrice}
                  disabled={savingPkg || !editCostUsd}
                >
                  {savingPkg ? "جارٍ الحفظ..." : "حفظ السعر الجديد"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Merchant Balance Modal */}
      <Dialog open={!!adjustBalance} onOpenChange={(o) => !o && setAdjustBalance(null)}>
        <DialogContent className="max-w-md bg-[#0a0f20] border border-cyan-500/40 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> تعديل رصيد التاجر المباشر
            </DialogTitle>
          </DialogHeader>
          {adjustBalance && (
            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                <div className="font-bold text-white text-sm">
                  {adjustBalance.merchant.profile?.full_name || adjustBalance.merchant.email || "تاجر"}
                </div>
                <div className="flex items-center justify-between text-slate-400 pt-1">
                  <span>الرصيد الحالي:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    ${(Number(adjustBalance.merchant.balance_egp || 0) / (egpRate || 50)).toFixed(2)} USD
                    {" "}({Number(adjustBalance.merchant.balance_egp || 0).toLocaleString("en-US")} ج.م)
                  </span>
                </div>
              </div>

              {/* Mode switch: USD vs EGP */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustBalance({ ...adjustBalance, mode: "usd" })}
                  className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    adjustBalance.mode === "usd"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  تحديد بالدولار ($ USD)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustBalance({ ...adjustBalance, mode: "egp" })}
                  className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    adjustBalance.mode === "egp"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  تحديد بالجنيه (EGP)
                </button>
              </div>

              {adjustBalance.mode === "usd" ? (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    الرصيد الجديد المطلوب بالدولار ($ USD) *
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={adjustBalance.amountUsd}
                    onChange={(e) => {
                      const usd = e.target.value;
                      const egp = String(Math.round((Number(usd) || 0) * (egpRate || 50) * 100) / 100);
                      setAdjustBalance({ ...adjustBalance, amountUsd: usd, amountEgp: egp });
                    }}
                    placeholder="مثال: 50"
                    className={`font-mono text-base ${DARK_INPUT}`}
                    autoFocus
                  />
                  <div className="text-[11px] text-cyan-300 mt-1 font-mono">
                    المعادل بالجنيه: ≈ {Number(adjustBalance.amountEgp || 0).toLocaleString("en-US")} ج.م (بسعر {egpRate} ج.م/$)
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    الرصيد الجديد المطلوب بالجنيه (EGP) *
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={adjustBalance.amountEgp}
                    onChange={(e) => {
                      const egp = e.target.value;
                      const usd = ((Number(egp) || 0) / (egpRate || 50)).toFixed(2);
                      setAdjustBalance({ ...adjustBalance, amountEgp: egp, amountUsd: usd });
                    }}
                    placeholder="مثال: 2500"
                    className={`font-mono text-base ${DARK_INPUT}`}
                    autoFocus
                  />
                  <div className="text-[11px] text-cyan-300 mt-1 font-mono">
                    المعادل بالدولار: ≈ ${adjustBalance.amountUsd} USD
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  سبب أو ملاحظة التعديل (اختياري)
                </label>
                <Input
                  placeholder="مثال: تصحيح رصيد / تسوية بنكية"
                  value={adjustBalance.note}
                  onChange={(e) => setAdjustBalance({ ...adjustBalance, note: e.target.value })}
                  className={DARK_INPUT}
                />
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  تنبيه: سيتم تعيين رصيد التاجر مباشرة إلى القيمة المحددة، وتسجيل حركة تسوية (adjustment) في كشف حساب المحفظة.
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  onClick={() => setAdjustBalance(null)}
                  disabled={adjustingBalance}
                >
                  إلغاء
                </Button>
                <Button
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                  onClick={submitAdjustBalance}
                  disabled={adjustingBalance || (!adjustBalance.amountUsd && !adjustBalance.amountEgp)}
                >
                  {adjustingBalance ? "جارٍ التعديل..." : "تأكيد تعديل الرصيد"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Merchant Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md bg-[#0a0f20] border border-rose-600/50 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> تأكيد حذف حساب التاجر
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-3.5 text-xs">
              <p className="text-slate-300 text-sm">
                هل أنت متأكد تماماً من رغبتك في حذف حساب التاجر التالي؟
              </p>

              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-1.5 font-mono">
                <div className="font-bold text-white text-sm font-sans">
                  {deleteTarget.profile?.full_name || "بدون اسم"}
                </div>
                <div className="text-slate-300 text-xs">
                  البريد / المعرف: <span className="text-white">{deleteTarget.email || deleteTarget.user_id}</span>
                </div>
                <div className="text-slate-300 text-xs">
                  الرصيد الحالي:{" "}
                  <span className="text-emerald-300 font-bold">
                    ${(Number(deleteTarget.balance_egp || 0) / (egpRate || 50)).toFixed(2)} USD
                    {" "}({Number(deleteTarget.balance_egp || 0).toLocaleString("en-US")} ج.م)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-[11px] text-slate-400 space-y-1">
                <div>• سيتم إزالة حساب التاجر ومحفظته وسجلات الحركات المالية المرتبطة به.</div>
                <div>• سيتم إعادة دور المستخدم إلى حساب عميل عادي (Customer).</div>
                <div>• سجل الطلبات السابقة سيبقى محفوظاً في النظام لأغراض التدقيق.</div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingMerchant}
                >
                  إلغاء التراجع
                </Button>
                <Button
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  onClick={submitDeleteMerchant}
                  disabled={deletingMerchant}
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingMerchant ? "جارٍ الحذف..." : "نعم، حذف التاجر نهائياً"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merchant Complete Profile Dialog */}
      <Dialog open={!!profileMerchantId} onOpenChange={(o) => !o && setProfileMerchantId(null)}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0a0f20] border border-purple-500/40 text-slate-100 rounded-2xl p-3.5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2 text-sm sm:text-base font-bold">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /> بروفايل التاجر الشامل والأسعار
              </span>

              {/* Desktop Header Actions (hidden on mobile) */}
              {profileData?.merchant && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-normal">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-cyan-600/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 h-7 text-xs"
                    onClick={() => openAdjustBalance(profileData.merchant)}
                  >
                    <Sliders className="w-3 h-3 ml-1" /> تعديل الرصيد
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-600/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/60 h-7 text-xs font-semibold"
                    onClick={() => setCredit({ id: profileData.merchant.id, amount: "", note: "" })}
                  >
                    <DollarSign className="w-3 h-3 ml-1" /> شحن +
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 h-7 text-xs"
                    onClick={() => setMarginEdit({ id: profileData.merchant.id, value: String(profileData.merchant.margin_percent || 0) })}
                  >
                    <Pencil className="w-3 h-3 ml-1" /> تعديل الهامش
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-700/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 h-7 text-xs"
                    onClick={() => openDeleteMerchant(profileData.merchant)}
                  >
                    <Trash2 className="w-3 h-3 ml-1" /> حذف التاجر
                  </Button>
                </div>
              )}
            </DialogTitle>

            {/* Mobile Header Actions (visible on mobile only) */}
            {profileData?.merchant && (
              <div className="grid grid-cols-2 gap-1.5 sm:hidden pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-600/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/60 h-8 text-xs font-semibold flex items-center justify-center gap-1"
                  onClick={() => setCredit({ id: profileData.merchant.id, amount: "", note: "" })}
                >
                  <DollarSign className="w-3.5 h-3.5" /> شحن رصيد +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-600/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 h-8 text-xs flex items-center justify-center gap-1"
                  onClick={() => openAdjustBalance(profileData.merchant)}
                >
                  <Sliders className="w-3.5 h-3.5" /> تعديل الرصيد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 h-8 text-xs flex items-center justify-center gap-1"
                  onClick={() => setMarginEdit({ id: profileData.merchant.id, value: String(profileData.merchant.margin_percent || 0) })}
                >
                  <Pencil className="w-3.5 h-3.5" /> تعديل الهامش
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-700/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 h-8 text-xs flex items-center justify-center gap-1"
                  onClick={() => openDeleteMerchant(profileData.merchant)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف التاجر
                </Button>
              </div>
            )}
          </DialogHeader>

          {profileLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400" />
              <div className="text-sm text-slate-300">جارٍ جلب وتجهيز بيانات وبروفايل التاجر...</div>
            </div>
          ) : profileData?.merchant ? (
            <div className="space-y-4 pt-1 sm:pt-2">
              {/* Profile Header Info */}
              <div className="rounded-2xl border border-slate-800 bg-[#0e1428] p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>{profileData.merchant.profile?.full_name || "تاجر بدون اسم"}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        profileData.merchant.is_active
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {profileData.merchant.is_active ? "حساب مفعل" : "حساب موقوف"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                    {profileData.merchant.email && (
                      <span className="text-slate-300 break-all">البريد: {profileData.merchant.email}</span>
                    )}
                    {profileData.merchant.profile?.phone && (
                      <span className="text-slate-300">الهاتف: {profileData.merchant.profile.phone}</span>
                    )}
                    <span className="text-slate-500 truncate max-w-full">ID: {profileData.merchant.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0 self-start md:self-auto">
                  <span className="text-slate-400">الجنسية:</span>
                  <span className="font-bold text-purple-300 uppercase px-2.5 py-1 rounded bg-purple-950/60 border border-purple-500/30">
                    {profileData.merchant.profile?.region || "EG"}
                  </span>
                </div>
              </div>

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
                    <span>الرصيد المتاح</span>
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-emerald-300 font-mono mt-1">
                    ${formatDecimals3(profileData.merchant.balance_usd)} USD
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
                    {formatDecimals3(profileData.merchant.balance_egp)} ج.م
                  </div>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
                    <span>هامش ربح الأدمن</span>
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-purple-300 font-mono mt-1">
                    +{profileData.merchant.margin_percent}%
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    فوق سعر التكلفة
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0e1428] p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
                    <span>إجمالي الطلبات</span>
                    <Package className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-white font-mono mt-1">
                    {profileData.orders?.length ?? 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-emerald-400 font-mono mt-0.5">
                    {profileData.orders?.filter((o: any) => o.status === "success").length ?? 0} ناجح
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0e1428] p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
                    <span>سعر الدولار</span>
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-amber-300 font-mono mt-1">
                    {formatDecimals3(profileData.egpRate)} ج.م / $
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    سعر المتجر الحالي
                  </div>
                </div>
              </div>

              {/* Tabs Navigation (Scrollable horizontally on mobile) */}
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none no-scrollbar">
                <button
                  type="button"
                  onClick={() => setProfileTab("packages")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap ${
                    profileTab === "packages"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  باقات وأسعار التاجر ({profileData.packagesPreview?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("ledger")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap ${
                    profileTab === "ledger"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  سجل حركات المحفظة ({profileData.transactions?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("orders")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap ${
                    profileTab === "orders"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  الطلبات الأخيرة ({profileData.orders?.length || 0})
                </button>
              </div>

              {/* Tab 1: Custom Merchant Packages & Exact Prices */}
              {profileTab === "packages" && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                        {[
                          { id: "all", label: "كافة الألعاب" },
                          { id: "mlbb", label: "Mobile Legends" },
                          { id: "pubg", label: "PUBG Mobile" },
                          { id: "freefire", label: "Free Fire" },
                          { id: "hok", label: "Honor of Kings" },
                        ].map((tg) => (
                          <button
                            key={tg.id}
                            type="button"
                            onClick={() => setProfilePkgGame(tg.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                              profilePkgGame === tg.id
                                ? "bg-slate-800 text-purple-300 border border-purple-500/40"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {tg.label}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        <Input
                          value={profilePkgSearch}
                          onChange={(e) => setProfilePkgSearch(e.target.value)}
                          placeholder="بحث بالاسم أو الكود..."
                          className={`h-8 text-xs pr-8 ${DARK_INPUT}`}
                        />
                      </div>
                    </div>

                    {/* Server/Region Filter */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      <span className="text-slate-400 text-[11px] font-semibold shrink-0 ml-1">السيرفر:</span>
                      {[
                        { id: "all", label: "كل السيرفرات" },
                        { id: "global", label: "عالمي (Global)" },
                        { id: "br", label: "البرازيل (Brazil)" },
                        { id: "mena", label: "الشرق الأوسط (MENA)" },
                      ].map((srv) => (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => setProfilePkgServer(srv.id)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-all ${
                            profilePkgServer === srv.id
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          {srv.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 1.A: Desktop Table for Packages */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 max-h-80">
                    <table className="w-full text-xs min-w-[700px]">
                      <thead className="bg-[#0e1428] text-slate-300 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-right">الباقة</th>
                          <th className="p-2.5">اللعبة والسيرفر</th>
                          <th className="p-2.5">تكلفة الجملة ($/ج.م)</th>
                          <th className="p-2.5 text-center bg-purple-950/40 text-purple-200">
                            سعر بيع الباقة للتاجر
                          </th>
                          <th className="p-2.5 text-center text-emerald-400">
                            صافي ربح الأدمن
                          </th>
                          <th className="p-2.5">سعر الجمهور</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {profileData.packagesPreview
                          ?.filter((p: any) => {
                            const gameMatch = profilePkgGame === "all" || p.gameId === profilePkgGame;
                            const pReg = Array.isArray(p.regions) && p.regions.length ? p.regions[0].toLowerCase() : (p.offerId?.includes("brazil") ? "br" : "global");
                            const serverMatch = profilePkgServer === "all" || pReg === profilePkgServer.toLowerCase();
                            const q = profilePkgSearch.trim().toLowerCase();
                            const textMatch = !q || p.name.toLowerCase().includes(q) || p.offerId.toLowerCase().includes(q);
                            return gameMatch && serverMatch && textMatch;
                          })
                          .map((p: any) => {
                            const pReg = Array.isArray(p.regions) && p.regions.length ? p.regions[0].toLowerCase() : (p.offerId?.includes("brazil") ? "br" : "global");
                            const srvLabel = pReg === "br" ? "البرازيل (Brazil)" : pReg === "mena" ? "MENA" : "عالمي (Global)";
                            const isBr = pReg === "br";
                            return (
                              <tr key={p.id} className="hover:bg-slate-900/40">
                                <td className="p-2.5 text-right">
                                  <div className="font-semibold text-white">{p.name}</div>
                                  {p.diamonds > 0 && (
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {p.diamonds} ماسة / شدة
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="uppercase font-mono font-bold text-[10px] text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                                      {p.gameId}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                      isBr
                                        ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                                        : "bg-purple-950/60 border-purple-500/30 text-purple-300"
                                    }`}>
                                      {srvLabel}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center font-mono">
                                  <div className="text-slate-300 font-bold">${formatDecimals3(p.costUsd)}</div>
                                  <div className="text-[10px] text-slate-500">{formatDecimals3(p.costEgp)} ج.م</div>
                                </td>
                                <td className="p-2.5 text-center font-mono bg-purple-950/20">
                                  <div className="font-extrabold text-purple-300 text-sm">
                                    {formatDecimals3(p.merchantPriceEgp)} ج.م
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    ≈ ${formatDecimals3(p.merchantPriceEgp / (profileData.egpRate || 50))} USD
                                  </div>
                                </td>
                                <td className="p-2.5 text-center font-mono text-emerald-400 font-bold">
                                  +{formatDecimals3(p.profitPerUnitEgp)} ج.م
                                </td>
                                <td className="p-2.5 text-center font-mono text-slate-400">
                                  {formatDecimals3(p.retailPriceEgp)} ج.م
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* 1.B: Mobile Responsive Cards for Packages */}
                  <div className="block md:hidden space-y-2.5 max-h-96 overflow-y-auto pr-0.5">
                    {profileData.packagesPreview
                      ?.filter((p: any) => {
                        const gameMatch = profilePkgGame === "all" || p.gameId === profilePkgGame;
                        const pReg = Array.isArray(p.regions) && p.regions.length ? p.regions[0].toLowerCase() : (p.offerId?.includes("brazil") ? "br" : "global");
                        const serverMatch = profilePkgServer === "all" || pReg === profilePkgServer.toLowerCase();
                        const q = profilePkgSearch.trim().toLowerCase();
                        const textMatch = !q || p.name.toLowerCase().includes(q) || p.offerId.toLowerCase().includes(q);
                        return gameMatch && serverMatch && textMatch;
                      })
                      .map((p: any) => {
                        const merchantUsd = formatDecimals3(p.merchantPriceEgp / (profileData.egpRate || 50));
                        const pReg = Array.isArray(p.regions) && p.regions.length ? p.regions[0].toLowerCase() : (p.offerId?.includes("brazil") ? "br" : "global");
                        const srvLabel = pReg === "br" ? "البرازيل (Brazil)" : pReg === "mena" ? "MENA" : "عالمي (Global)";
                        const isBr = pReg === "br";
                        return (
                          <div
                            key={p.id}
                            className="rounded-xl border border-slate-800 bg-[#0d1326] p-3 space-y-2 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="uppercase font-mono font-bold text-[10px] text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                                    {p.gameId}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                    isBr
                                      ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                                      : "bg-purple-950/60 border-purple-500/30 text-purple-300"
                                  }`}>
                                    {srvLabel}
                                  </span>
                                  <span className="font-bold text-white text-xs">{p.name}</span>
                                </div>
                                {p.diamonds > 0 && (
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {p.diamonds} ماسة / شدة
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                                +{formatDecimals3(p.profitPerUnitEgp)} ج.م ربح
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 bg-[#080c1b] border border-slate-800/80 rounded-lg p-2 text-center text-xs">
                              <div>
                                <div className="text-[10px] text-slate-400">تكلفة الجملة</div>
                                <div className="font-mono text-slate-300 text-xs font-bold">${formatDecimals3(p.costUsd)}</div>
                                <div className="font-mono text-[9px] text-slate-500">{formatDecimals3(p.costEgp)} ج.م</div>
                              </div>
                              <div className="bg-purple-950/30 border border-purple-500/20 rounded-md py-0.5 px-1">
                                <div className="text-[10px] text-purple-200 font-semibold">سعر التاجر</div>
                                <div className="font-mono font-extrabold text-purple-300 text-sm">
                                  {formatDecimals3(p.merchantPriceEgp)} ج.م
                                </div>
                                <div className="font-mono text-[9px] text-purple-400">≈ ${merchantUsd}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400">سعر الجمهور</div>
                                <div className="font-mono text-slate-300 text-xs">{formatDecimals3(p.retailPriceEgp)} ج.م</div>
                                <div className="text-[9px] text-slate-500">للمستهلك</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Tab 2: Wallet Transactions Ledger */}
              {profileTab === "ledger" && (
                <div className="space-y-3">
                  {/* 2.A: Desktop Table for Ledger */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 max-h-80">
                    <table className="w-full text-xs min-w-[650px]">
                      <thead className="bg-[#0e1428] text-slate-300 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-right">نوع الحركة</th>
                          <th className="p-2.5">المبلغ</th>
                          <th className="p-2.5">الرصيد بعد الحركة</th>
                          <th className="p-2.5 text-right">الملاحظة / المرجع</th>
                          <th className="p-2.5 text-left">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {profileData.transactions?.map((t: any) => {
                          const amt = Number(t.amount_egp || 0);
                          return (
                            <tr key={t.id} className="hover:bg-slate-900/40">
                              <td className="p-2.5 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.entry_type === "admin_credit"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : t.entry_type === "order_debit"
                                      ? "bg-rose-500/20 text-rose-300"
                                      : t.entry_type === "refund"
                                      ? "bg-cyan-500/20 text-cyan-300"
                                      : "bg-purple-500/20 text-purple-300"
                                  }`}
                                >
                                  {t.entry_type === "admin_credit"
                                    ? "إيداع رصيد"
                                    : t.entry_type === "order_debit"
                                    ? "خصم طلب"
                                    : t.entry_type === "refund"
                                    ? "استرداد"
                                    : "تسوية رصيد"}
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold">
                                <span className={amt >= 0 ? "text-emerald-300" : "text-rose-400"}>
                                  {amt >= 0 ? `+${amt}` : amt} ج.م
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-300">
                                {Number(t.balance_after_egp || 0).toLocaleString("en-US")} ج.م
                              </td>
                              <td className="p-2.5 text-right text-slate-300 font-mono text-[11px]">
                                {t.note || t.order_id || "—"}
                              </td>
                              <td className="p-2.5 text-left text-slate-400 font-mono text-[10px]">
                                {new Date(t.created_at).toLocaleString("ar-EG")}
                              </td>
                            </tr>
                          );
                        })}
                        {(!profileData.transactions || profileData.transactions.length === 0) && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              لا توجد حركات محفظة مسجلة لهذا التاجر بعد.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 2.B: Mobile Responsive Cards for Ledger */}
                  <div className="block md:hidden space-y-2 max-h-96 overflow-y-auto pr-0.5">
                    {profileData.transactions?.map((t: any) => {
                      const amt = Number(t.amount_egp || 0);
                      const isCredit = amt >= 0;
                      return (
                        <div
                          key={t.id}
                          className="rounded-xl border border-slate-800 bg-[#0d1326] p-3 space-y-1.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.entry_type === "admin_credit"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : t.entry_type === "order_debit"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : t.entry_type === "refund"
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {t.entry_type === "admin_credit"
                                ? "إيداع رصيد"
                                : t.entry_type === "order_debit"
                                ? "خصم طلب"
                                : t.entry_type === "refund"
                                ? "استرداد"
                                : "تسوية رصيد"}
                            </span>

                            <span className={`font-mono font-bold text-sm ${isCredit ? "text-emerald-300" : "text-rose-400"}`}>
                              {isCredit ? `+${amt}` : amt} ج.م
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span className="font-mono text-slate-300 truncate max-w-[65%]">
                              {t.note || t.order_id || "—"}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">
                              {new Date(t.created_at).toLocaleDateString("ar-EG")}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono border-t border-slate-800/80 pt-1 flex justify-between">
                            <span>الرصيد بعد الحركة:</span>
                            <span className="text-slate-300 font-bold">{Number(t.balance_after_egp || 0).toLocaleString("en-US")} ج.م</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!profileData.transactions || profileData.transactions.length === 0) && (
                      <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                        لا توجد حركات محفظة مسجلة لهذا التاجر بعد.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Recent Orders */}
              {profileTab === "orders" && (
                <div className="space-y-3">
                  {/* 3.A: Desktop Table for Orders */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 max-h-80">
                    <table className="w-full text-xs min-w-[650px]">
                      <thead className="bg-[#0e1428] text-slate-300 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-right">المرجع</th>
                          <th className="p-2.5 text-right">اللعبة / اللاعب</th>
                          <th className="p-2.5">الإجمالي</th>
                          <th className="p-2.5">الحالة</th>
                          <th className="p-2.5 text-left">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {profileData.orders?.map((o: any) => (
                          <tr key={o.id} className="hover:bg-slate-900/40">
                            <td className="p-2.5 text-right font-mono text-cyan-300 font-bold">
                              {o.order_ref}
                            </td>
                            <td className="p-2.5 text-right">
                              <span className="uppercase font-bold text-slate-300">{o.game_id}</span> • {o.player_id}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-white">
                              {o.total_egp} ج.م
                            </td>
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
                                {o.status === "success"
                                  ? "مكتمل"
                                  : o.status === "failed"
                                  ? "فشل"
                                  : "قيد التنفيذ"}
                              </span>
                            </td>
                            <td className="p-2.5 text-left text-slate-400 font-mono text-[10px]">
                              {new Date(o.created_at).toLocaleString("ar-EG")}
                            </td>
                          </tr>
                        ))}
                        {(!profileData.orders || profileData.orders.length === 0) && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              لا توجد طلبات سابقة لهذا التاجر.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 3.B: Mobile Responsive Cards for Orders */}
                  <div className="block md:hidden space-y-2 max-h-96 overflow-y-auto pr-0.5">
                    {profileData.orders?.map((o: any) => (
                      <div
                        key={o.id}
                        className="rounded-xl border border-slate-800 bg-[#0d1326] p-3 space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-mono text-cyan-300 font-bold text-xs truncate">
                            {o.order_ref}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === "success"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : o.status === "failed"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {o.status === "success"
                              ? "مكتمل"
                              : o.status === "failed"
                              ? "فشل"
                              : "قيد التنفيذ"}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300">
                          <span className="uppercase font-bold text-purple-300">{o.game_id}</span> • {o.player_id}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                          <span className="font-mono font-bold text-white">{o.total_egp} ج.م</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(o.created_at).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!profileData.orders || profileData.orders.length === 0) && (
                      <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                        لا توجد طلبات سابقة لهذا التاجر.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
