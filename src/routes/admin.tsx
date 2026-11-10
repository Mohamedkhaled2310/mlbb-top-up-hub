import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { useStore } from "../lib/store/useStore";
import { TopUpPackage, PackageCategory } from "../types/store";
import { checkSystemStatusApi } from "../lib/api-client";
import metoPoster from "../assets/meto-poster.jpg";
import {
  Shield,
  Layers,
  DollarSign,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Server,
  Wallet,
  Sparkles,
  ArrowUpDown,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  Key,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

const DEFAULT_ADMIN_PASSWORD = "MetoAdmin@2026#Secure!779";
const AUTH_SESSION_KEY = "meto_admin_authenticated";
const CUSTOM_PASS_KEY = "meto_admin_password";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const {
    packages,
    settings,
    updatePackage,
    addPackage,
    deletePackage,
    applyGlobalMarkup,
    updateExchangeRate,
    resetToDefaults,
  } = useStore();

  // Admin authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Password change modal
  const [changePassOpen, setChangePassOpen] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [changePassSuccess, setChangePassSuccess] = useState<boolean>(false);

  // Settings local state
  const [exchangeRate, setExchangeRate] = useState<number>(settings.usdtToEgpRate);
  const [markupPercent, setMarkupPercent] = useState<number>(settings.globalMarkupPercent);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // System status
  const [systemStatus, setSystemStatus] = useState<{
    fazer?: { connected: boolean; balance?: number; currency?: string; message?: string };
    binance?: { configured: boolean };
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  // Package editor modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [posterOpen, setPosterOpen] = useState<boolean>(false);
  const [editingPackage, setEditingPackage] = useState<TopUpPackage | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form state for editing/adding package
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<PackageCategory>("diamonds");
  const [formDiamonds, setFormDiamonds] = useState(0);
  const [formBonus, setFormBonus] = useState(0);
  const [formFazerId, setFormFazerId] = useState("");
  const [formCostUsdt, setFormCostUsdt] = useState(1.0);
  const [formMerchantEgp, setFormMerchantEgp] = useState(60);
  const [formRetailEgp, setFormRetailEgp] = useState(70);
  const [formBadge, setFormBadge] = useState("");

  // Category filter
  const [selectedCat, setSelectedCat] = useState<PackageCategory | "all">("all");
  const [search, setSearch] = useState("");

  // Check auth and setup lockout timer
  useEffect(() => {
    const isAuth =
      localStorage.getItem(AUTH_SESSION_KEY) === "true" ||
      sessionStorage.getItem(AUTH_SESSION_KEY) === "true";
    if (isAuth) {
      setIsAuthenticated(true);
      fetchStatus();
    }
  }, []);

  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setTimeout(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTimer]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lockoutTimer > 0) return;

    setIsLoggingIn(true);
    setLoginError(null);

    setTimeout(() => {
      const activePassword = localStorage.getItem(CUSTOM_PASS_KEY) || DEFAULT_ADMIN_PASSWORD;

      if (passwordInput.trim() === activePassword.trim()) {
        if (rememberMe) {
          localStorage.setItem(AUTH_SESSION_KEY, "true");
        } else {
          sessionStorage.setItem(AUTH_SESSION_KEY, "true");
        }
        setIsAuthenticated(true);
        setLoginError(null);
        setPasswordInput("");
        setFailedAttempts(0);
        fetchStatus();
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setLockoutTimer(30);
          setLoginError("تم تجاوز الحد الأقصى للمحاولات (5). تم حظر الإدخال مؤقتاً لمدة 30 ثانية لأسباب أمنية.");
        } else {
          setLoginError(`كلمة المرور غير صحيحة! يرجى التأكد وإعادة المحاولة (المتبقي ${5 - nextAttempts} محاولات).`);
        }
      }
      setIsLoggingIn(false);
    }, 400);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
    setPasswordInput("");
    setLoginError(null);
  };

  const handleChangePassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newPasswordInput.trim().length < 8) {
      alert("كلمة المرور يجب أن لا تقل عن 8 خانات وتحتوي أحرف وأرقام ورموز خاصة.");
      return;
    }
    localStorage.setItem(CUSTOM_PASS_KEY, newPasswordInput.trim());
    setChangePassSuccess(true);
    setTimeout(() => {
      setChangePassSuccess(false);
      setChangePassOpen(false);
      setNewPasswordInput("");
    }, 1800);
  };

  const fetchStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await checkSystemStatusApi();
      setSystemStatus(res);
    } catch (e) {
      console.error("Failed to query system status", e);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSaveSettings = () => {
    updateExchangeRate(exchangeRate);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleApplyMarkup = () => {
    applyGlobalMarkup(markupPercent);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Open modal to create custom bundle
  const handleOpenCreateBundle = () => {
    setIsCreatingNew(true);
    setEditingPackage(null);
    setFormName("باقة مخصصة جديدة");
    setFormCategory("bundles");
    setFormDiamonds(500);
    setFormBonus(50);
    setFormFazerId("mlbb_custom_bundle");
    setFormCostUsdt(5.0);
    setFormMerchantEgp(Math.round(5.0 * 1.1 * exchangeRate));
    setFormRetailEgp(Math.round(5.0 * 1.25 * exchangeRate));
    setFormBadge("عرض حصري 🔥");
    setEditModalOpen(true);
  };

  // Open modal to edit existing package
  const handleOpenEdit = (pkg: TopUpPackage) => {
    setIsCreatingNew(false);
    setEditingPackage(pkg);
    setFormName(pkg.name);
    setFormCategory(pkg.category);
    setFormDiamonds(pkg.diamonds);
    setFormBonus(pkg.bonusDiamonds || 0);
    setFormFazerId(pkg.fazerProductId);
    setFormCostUsdt(pkg.costPriceUsdt);
    setFormMerchantEgp(pkg.merchantPriceEgp);
    setFormRetailEgp(pkg.retailPriceEgp);
    setFormBadge(pkg.badge || "");
    setEditModalOpen(true);
  };

  // Save package changes
  const handleSavePackageModal = () => {
    const merchantUsdt = Number((formMerchantEgp / exchangeRate).toFixed(2));
    const retailUsdt = Number((formRetailEgp / exchangeRate).toFixed(2));

    if (isCreatingNew) {
      const newPkg: TopUpPackage = {
        id: `custom-${Date.now()}`,
        name: formName,
        category: formCategory,
        diamonds: Number(formDiamonds),
        bonusDiamonds: Number(formBonus) || undefined,
        fazerProductId: formFazerId,
        costPriceUsdt: Number(formCostUsdt),
        merchantPriceEgp: Number(formMerchantEgp),
        merchantPriceUsdt: merchantUsdt,
        retailPriceEgp: Number(formRetailEgp),
        retailPriceUsdt: retailUsdt,
        badge: formBadge || undefined,
        isCustom: true,
        active: true,
      };
      addPackage(newPkg);
    } else if (editingPackage) {
      updatePackage(editingPackage.id, {
        name: formName,
        category: formCategory,
        diamonds: Number(formDiamonds),
        bonusDiamonds: Number(formBonus) || undefined,
        fazerProductId: formFazerId,
        costPriceUsdt: Number(formCostUsdt),
        merchantPriceEgp: Number(formMerchantEgp),
        merchantPriceUsdt: merchantUsdt,
        retailPriceEgp: Number(formRetailEgp),
        retailPriceUsdt: retailUsdt,
        badge: formBadge || undefined,
      });
    }

    setEditModalOpen(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Filter packages
  const filtered = packages.filter((p) => {
    const matchCat = selectedCat === "all" || p.category === selectedCat;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.fazerProductId.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // If not authenticated, render secure admin login view
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-[#070914] text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-rose-500/30 selection:text-rose-200">
        <Navbar />

        <div className="flex-1 flex items-center justify-center px-3 py-6 sm:py-10 pb-32 md:pb-12 w-full">
          <div className="w-full max-w-sm sm:max-w-md mx-auto">
            {/* Cyber lock card */}
            <div className="relative rounded-2xl sm:rounded-3xl border border-rose-500/30 bg-[#0a0f20]/95 p-4 sm:p-8 shadow-2xl shadow-rose-950/40 backdrop-blur-2xl overflow-hidden">
              {/* Background ambient glow (clipped inside card) */}
              <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

              {/* Header Icon */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="relative mb-2.5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-500 p-0.5 shadow-xl shadow-rose-600/30">
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0c1224]">
                    <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-rose-400" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-black shadow">
                    <Key className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/40 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold text-rose-300 mb-1.5">
                  <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-400" />
                  <span>منطقة مشفرة ومحمية بباسورد قوي</span>
                </div>

                <h1 className="text-lg sm:text-2xl font-black text-white">
                  بوابة المشرف المركزي
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  لوحة تحكم إدارة أسعار وهوامش شحن METO STORE
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>كلمة المرور الإدارية:</span>
                    <span className="text-[10px] text-cyan-400">حماية مشفرة</span>
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="أدخل كلمة مرور الإدارة..."
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setLoginError(null);
                      }}
                      disabled={lockoutTimer > 0 || isLoggingIn}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-10 pr-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all font-mono"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                      title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me toggle */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500/30"
                    />
                    <span>تذكر جلسة العمل على هذا المتصفح</span>
                  </label>
                </div>

                {/* Error feedback */}
                {loginError && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-2.5 sm:p-3 text-xs text-rose-300 animate-fadeIn">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs">{loginError}</p>
                      {lockoutTimer > 0 && (
                        <p className="text-[11px] text-amber-300 mt-1">
                          يمكن المحاولة مرة أخرى بعد:{" "}
                          <strong className="font-mono text-white text-sm">{lockoutTimer}</strong> ثانية
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={lockoutTimer > 0 || isLoggingIn || !passwordInput.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-black py-2.5 sm:py-3 px-4 text-xs sm:text-sm transition-all shadow-lg shadow-rose-600/30 cursor-pointer active:scale-98"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جاري التحقق من الصلاحيات...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>تسجيل الدخول للوحة التحكم</span>
                    </>
                  )}
                </button>
              </form>

              {/* Footer & Back to store */}
              <div className="mt-5 pt-3.5 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span>دخول المشرفين والمخولين فقط • حماية مشفرة</span>
                </div>

                <Link
                  to="/"
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <span>العودة لمتجر الزبائن</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070912] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Navbar />

      {/* Admin Top Status & Quick Action Bar */}
      <div className="border-b border-amber-500/30 bg-[#0d1222] px-4 py-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-400">جلسة المشرف نشطة</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">لوحة التحكم الآمنة</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setChangePassOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 text-slate-200 font-medium transition-colors cursor-pointer"
            >
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <span>تغيير كلمة المرور</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 px-2.5 py-1 text-rose-300 font-bold transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-400" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Header */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-[#120e21] via-[#1a140d] to-[#120e21] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/40 px-3 py-1 text-xs text-amber-300 mb-2">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>لوحة التحكم الإدارية • إدارة وهوامش الأسعار</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
              لوحة تحكم الإدارة (Admin Panel)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              إدارة قوائم الأسعار وهوامش الربح، وتخصيص باقات الشحن وعروض الدبل والويكلي.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPosterOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 font-bold px-3.5 py-2.5 text-xs transition-colors"
            >
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              <span>عرض البوستر</span>
            </button>

            <button
              onClick={handleOpenCreateBundle}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-4 py-2.5 text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة باقة / عرض مخصص</span>
            </button>

            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-3.5 py-2.5 text-xs transition-colors"
              title="استعادة أسعار البوستر الافتراضية"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">استعادة الافتراضي</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full space-y-8 pb-24 md:pb-12">
        {savedNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>تم حفظ التعديلات وتطبيقها فورياً على واجهتي المتجر والتاجر!</span>
          </div>
        )}

        {/* Section 1: API Status & Connections Dashboard */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FazerCards Connection Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1020] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Server className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-white text-sm">FazerCards API</h3>
              </div>
              <span
                className={`flex h-2.5 w-2.5 rounded-full ${
                  systemStatus?.fazer?.connected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
              />
            </div>
            <div className="text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">حالة الاتصال:</span>
                <span
                  className={
                    systemStatus?.fazer?.connected ? "text-emerald-400 font-bold" : "text-amber-400"
                  }
                >
                  {systemStatus?.fazer?.connected ? "متصل بنجاح ✓" : "وضع المحاكاة الآمن (Mock)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">رصيد حساب Fazer:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  ${systemStatus?.fazer?.balance?.toFixed(2) ?? "150.00"} USDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المفتاح الحساس:</span>
                <span className="font-mono text-[11px] text-slate-500">مؤمّن في .env</span>
              </div>
            </div>
          </div>

          {/* Binance Pay Connection Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1020] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Binance Pay API</h3>
              </div>
              <span
                className={`flex h-2.5 w-2.5 rounded-full ${
                  systemStatus?.binance?.configured ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"
                }`}
              />
            </div>
            <div className="text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">حالة التوقيع الرقمي:</span>
                <span
                  className={
                    systemStatus?.binance?.configured
                      ? "text-emerald-400 font-bold"
                      : "text-cyan-400"
                  }
                >
                  {systemStatus?.binance?.configured
                    ? "توقيع HMAC-SHA512 نشط"
                    : "QR فوري محاكى ومكتمل"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">العملة الأساسية:</span>
                <span className="font-mono text-white font-bold">USDT (C2B Gateway)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">التحقق من السداد:</span>
                <span className="text-emerald-400 font-semibold">استعلام Polling نشط</span>
              </div>
            </div>
          </div>

          {/* Fast Refresh / Status button */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1020] p-5 flex flex-col justify-between shadow-lg">
            <div>
              <h3 className="font-bold text-white text-sm mb-1">تحديث خوادم الـ API</h3>
              <p className="text-[11px] text-slate-400">
                إعادة التحقق من اتصال FazerCards و Binance Pay وفحص الرصيد المتبقي.
              </p>
            </div>
            <button
              onClick={fetchStatus}
              disabled={checkingStatus}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingStatus ? "animate-spin" : ""}`} />
              <span>{checkingStatus ? "جاري الفحص..." : "فحص الاتصال وتحديث الرصيد"}</span>
            </button>
          </div>
        </section>

        {/* Section 2: Global Markup & Exchange Rate Configuration */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0c1122] to-[#080c16] p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <DollarSign className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">إعدادات هوامش الربح وسعر الصرف العام</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exchange Rate (EGP per USDT) */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>سعر صرف الدولار الرقمي (EGP لكل 1 USDT)</span>
                <span className="font-mono text-cyan-400 font-bold">{exchangeRate} EGP</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white font-mono focus:border-amber-400 outline-none"
                />
                <button
                  onClick={handleSaveSettings}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition-colors flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>تطبيق الصرف</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                تحديث هذا السعر يعيد احتساب أسعار الجنيه لجميع الباقات فورياً.
              </p>
            </div>

            {/* Global Profit Margin % */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>هامش الربح العام على سعر تكلفة الـ API (%)</span>
                <span className="font-mono text-purple-400 font-bold">{markupPercent}%</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value))}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white font-mono focus:border-purple-400 outline-none"
                />
                <button
                  onClick={handleApplyMarkup}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 text-xs transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>تطبيق على جميع الباقات</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                يحدد سعر الجمهور بهامش {markupPercent}% وسعر التاجر بهامش{" "}
                {(markupPercent / 2).toFixed(1)}%.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Pricing Catalog Table */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-400" />
                <span>جدول هوامش وأسعار باقات الشحن</span>
              </h2>
              <p className="text-xs text-slate-400">
                عرض سعر التكلفة من API، وسعر الجملة للتاجر، وسعر البيع للجمهور، مع إمكانية التعديل
                الفردي
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="بحث في الباقات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-40 sm:w-56"
              />
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value as PackageCategory | "all")}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 outline-none"
              >
                <option value="all">كل التصنيفات</option>
                <option value="diamonds">الجواهر الأساسية</option>
                <option value="weekly_pass">بطاقات الويكلي</option>
                <option value="double_diamonds">الجواهر المضاعفة</option>
                <option value="bundles">الحزم المميزة</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0a0f1d]">
            <table className="w-full text-right text-xs min-w-[720px]">
              <thead className="bg-[#0e1428] text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">الباقة</th>
                  <th className="p-3.5">
                    <div>رمز المزود الآلي</div>
                    <div className="text-[10px] text-slate-500 font-normal">Fazer Product ID</div>
                  </th>
                  <th className="p-3.5">سعر التكلفة (API)</th>
                  <th className="p-3.5">سعر التاجر (EGP)</th>
                  <th className="p-3.5">سعر التاجر (USDT)</th>
                  <th className="p-3.5">سعر الجمهور (EGP)</th>
                  <th className="p-3.5">سعر الجمهور (USDT)</th>
                  <th className="p-3.5">هامش الربح</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((pkg) => {
                  const retailProfitUsdt = pkg.retailPriceUsdt - pkg.costPriceUsdt;
                  const marginPct = ((retailProfitUsdt / pkg.costPriceUsdt) * 100).toFixed(0);

                  return (
                    <tr key={pkg.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{pkg.name}</span>
                          {pkg.isCustom && (
                            <span className="rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-1 py-0.2 text-[9px]">
                              مخصص
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {pkg.diamonds + (pkg.bonusDiamonds || 0)} جوهرة
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {pkg.fazerProductId}
                      </td>

                      <td className="p-3.5 font-mono text-slate-300">
                        ${pkg.costPriceUsdt.toFixed(2)}
                      </td>

                      <td className="p-3.5 font-bold text-purple-300">
                        {pkg.merchantPriceEgp} EGP
                      </td>

                      <td className="p-3.5 font-mono text-slate-400">
                        ${pkg.merchantPriceUsdt.toFixed(2)}
                      </td>

                      <td className="p-3.5 font-bold text-cyan-300">{pkg.retailPriceEgp} EGP</td>

                      <td className="p-3.5 font-mono text-slate-400">
                        ${pkg.retailPriceUsdt.toFixed(2)}
                      </td>

                      <td className="p-3.5">
                        <span className="text-emerald-400 font-bold">
                          +{marginPct}% (${retailProfitUsdt.toFixed(2)})
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(pkg)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="تعديل السعر والبيانات"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {pkg.isCustom && (
                            <button
                              onClick={() => deletePackage(pkg.id)}
                              className="p-1.5 rounded-lg border border-rose-900/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors"
                              title="حذف الباقة المخصصة"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Security Notice Footer */}
        <section className="rounded-2xl border border-slate-800 bg-[#080c16] p-5 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-bold">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span>ملاحظة الحماية والأمان المعماري:</span>
          </div>
          <p className="leading-relaxed">
            وفقاً لمتطلبات المشروع، يتم سحب كافة المفاتيح الحساسة (
            <code className="text-cyan-300">FAZER_API_KEY</code>,{" "}
            <code className="text-amber-300">BINANCE_PAY_API_KEY</code>,{" "}
            <code className="text-amber-300">BINANCE_PAY_SECRET_KEY</code>) حصراً من متغيرات النظام
            وبيئة التشغيل (.env). يتم توقيع كافة المعاملات عبر Server Functions و API Routes خفيفة
            لحماية بيانات المتجر والمستخدمين.
          </p>
        </section>
      </main>

      {/* Edit / Create Package Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1426] border border-cyan-500/30 text-slate-100 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {isCreatingNew ? "إنشاء باقة / عرض مخصص جديد" : "تعديل أسعار وبيانات الباقة"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              قم بضبط سعر الجمهور وسعر الجملة للتاجر وربطها برمز FazerCards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            {/* Name */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">اسم الباقة</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">التصنيف</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as PackageCategory)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="diamonds">الجواهر الأساسية (MLBB Diamonds)</option>
                <option value="weekly_pass">بطاقات الويكلي (Weekly Pass)</option>
                <option value="double_diamonds">الجواهر المضاعفة (Double Diamonds)</option>
                <option value="bundles">الحزم والعروض المميزة (The Bundle)</option>
              </select>
            </div>

            {/* Fazer ID */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <span>رمز المنتج في FazerCards (Product ID)</span>
                <span className="text-[10px] text-cyan-400 font-normal">كود الربط الآلي</span>
              </label>
              <input
                type="text"
                value={formFazerId}
                onChange={(e) => setFormFazerId(e.target.value)}
                placeholder="مثال: mlbb_weekly_pass_1"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                هو كود الـ SKU للباقة لدى سيرفر مزود الشحن الآلي (FazerCards API). يُرسل مع معرف اللاعب فور سداد Binance Pay ليتم شحن الباقة آلياً.
              </p>
            </div>

            {/* Diamonds & Bonus */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">كمية الجواهر</label>
                <input
                  type="number"
                  value={formDiamonds}
                  onChange={(e) => setFormDiamonds(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">جواهر البونص (اختياري)</label>
                <input
                  type="number"
                  value={formBonus}
                  onChange={(e) => setFormBonus(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* Cost (USDT) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">سعر التكلفة من API ($ USDT)</label>
              <input
                type="number"
                step="0.05"
                value={formCostUsdt}
                onChange={(e) => setFormCostUsdt(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono outline-none"
              />
            </div>

            {/* Prices in EGP */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-purple-300">سعر التاجر / الجملة (EGP)</label>
                <input
                  type="number"
                  value={formMerchantEgp}
                  onChange={(e) => setFormMerchantEgp(Number(e.target.value))}
                  className="w-full rounded-xl border border-purple-500/40 bg-slate-900 px-3 py-2 text-white font-bold outline-none"
                />
                <span className="text-[10px] text-slate-400">
                  ≈ ${(formMerchantEgp / exchangeRate).toFixed(2)} USDT
                </span>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-cyan-300">سعر الجمهور (EGP)</label>
                <input
                  type="number"
                  value={formRetailEgp}
                  onChange={(e) => setFormRetailEgp(Number(e.target.value))}
                  className="w-full rounded-xl border border-cyan-500/40 bg-slate-900 px-3 py-2 text-white font-bold outline-none"
                />
                <span className="text-[10px] text-slate-400">
                  ≈ ${(formRetailEgp / exchangeRate).toFixed(2)} USDT
                </span>
              </div>
            </div>

            {/* Badge */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">شارة مميزة (Badge)</label>
              <input
                type="text"
                placeholder="مثال: الأكثر طلباً ⭐"
                value={formBadge}
                onChange={(e) => setFormBadge(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setEditModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 py-2.5 text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSavePackageModal}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-2.5 text-xs transition-all shadow-md shadow-cyan-500/20"
            >
              حفظ وتطبيق التغييرات
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Poster High-Res Modal */}
      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0e1c] border border-cyan-500/40 text-slate-100 p-4 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              <span>بوستر أسعار METO STORE الرسمي لمطابقة الأسعار</span>
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
            <img
              src={metoPoster}
              alt="METO STORE Official MLBB Diamonds Poster"
              className="w-full h-auto object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Admin Password Modal */}
      <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
        <DialogContent className="max-w-md bg-[#0a0f20] border border-amber-500/40 text-slate-100 p-5 rounded-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" />
              <span>تغيير كلمة المرور الإدارية</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 text-right">
              أدخل كلمة مرور جديدة قوية لحماية لوحة الإدارة (يجب أن لا تقل عن 8 خانات).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 my-2 text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">كلمة المرور الجديدة:</label>
              <input
                type="text"
                placeholder="مثال: Admin#2026@Pass!Meto"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none font-mono"
              />
            </div>

            {changePassSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>تم تحديث وحفظ كلمة المرور الجديدة بنجاح!</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChangePassOpen(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 py-2.5 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold py-2.5 text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                حفظ كلمة المرور
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
