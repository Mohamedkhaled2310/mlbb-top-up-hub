import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { CheckoutModal } from "../components/CheckoutModal";
import { PlayerIdGuideModal } from "../components/PlayerIdGuideModal";
import { useStore } from "../lib/store/useStore";
import { TopUpPackage, PackageCategory } from "../types/store";
import { validatePlayerApi } from "../lib/api-client";
import heroBg from "../assets/mlbb-arena.jpg";
import {
  Gem,
  Calendar,
  Sparkles,
  Package,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Clock,
  ChevronRight,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: CustomerStorePage,
});

function CustomerStorePage() {
  const { packages, settings } = useStore();

  // Form states
  const [userId, setUserId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [selectedPackage, setSelectedPackage] = useState<TopUpPackage | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  // Validate Player ID
  const handleVerifyPlayer = async () => {
    if (!userId.trim() || !zoneId.trim()) {
      setVerifyError("يرجى إدخال كل من User ID و Zone ID");
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifiedName(null);

    try {
      const res = await validatePlayerApi(userId.trim(), zoneId.trim());

      if (res.valid && res.username) {
        setVerifiedName(res.username);
      } else {
        setVerifyError(res.error || "تعذر التحقق من الحساب، تأكد من الأرقام المدخلة");
      }
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setVerifying(false);
    }
  };

  // Open checkout modal
  const handleSelectPackage = (pkg: TopUpPackage) => {
    if (!userId.trim() || !zoneId.trim()) {
      setVerifyError(
        "يرجى إدخال معرف اللاعب (User ID) ورقم السيرفر (Zone ID) أولاً قبل اختيار الباقة",
      );
      window.scrollTo({ top: 320, behavior: "smooth" });
      return;
    }

    setSelectedPackage(pkg);
    setCheckoutOpen(true);
  };

  // Filter packages
  const filteredPackages = packages.filter((pkg) => {
    if (!pkg.active && pkg.active !== undefined) return false;
    const matchCat = selectedCategory === "all" || pkg.category === selectedCategory;
    const matchQuery =
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.diamonds.toString().includes(searchQuery) ||
      (pkg.bonusDiamonds && pkg.bonusDiamonds.toString().includes(searchQuery));
    return matchCat && matchQuery;
  });

  const categories = [
    { id: "all", label: "جميع الباقات", icon: Layers },
    { id: "diamonds", label: "الجواهر الأساسية", icon: Gem },
    { id: "weekly_pass", label: "بطاقات الويكلي", icon: Calendar },
    { id: "double_diamonds", label: "الجواهر المضاعفة (x2)", icon: Sparkles },
    { id: "bundles", label: "الحزم المميزة", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-cyan-500/15">
        {/* Background Image with Gaming Gradients */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 transform filter blur-[1px]"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/85 to-[#070a13]/60" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-purple-600/15 blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs text-cyan-300 backdrop-blur-md mb-4 shadow-sm shadow-cyan-500/20">
            <Zap className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>شحن فوري مباشر عبر المعرف الرسمي • دفع آمن بـ Binance Pay</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4">
            متجر شحن <span className="gaming-gradient-text">Mobile Legends</span> الرسمي
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-300 mb-8 leading-relaxed">
            اشحن جواهر وباقات وبطاقات الويكلي لحسابك في MLBB في ثوانٍ معدودة. أفضل أسعار في الشرق
            الأوسط بالجنيه المصري و USDT بتنفيذ آلي فوري عبر FazerCards.
          </p>

          {/* Quick Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-xs text-slate-300">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1222]/80 p-2.5 backdrop-blur-sm">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span>تنفيذ تلقائي فوري خلال 30 ثانية</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1222]/80 p-2.5 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>دفع مشفر بدون عمولات خفية</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1222]/80 p-2.5 backdrop-blur-sm">
              <Gem className="h-4 w-4 text-purple-400" />
              <span>باقات الويكلي وعروض الدبل الرسمية</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full space-y-10">
        {/* Step 1: Player ID Card */}
        <section className="relative rounded-2xl border border-cyan-500/25 bg-[#0a0f1e]/90 p-5 sm:p-7 shadow-xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-extrabold text-sm border border-cyan-500/30">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">أدخل معرف حساب اللاعب (MLBB ID)</h2>
                <p className="text-xs text-slate-400">
                  تحقق من الاسم المستعار لتفادي إرسال الشحن لحساب خاطئ
                </p>
              </div>
            </div>

            <button
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors self-start sm:self-auto"
            >
              <HelpCircle className="h-4 w-4" />
              <span>أين أجد الـ User ID والـ Zone ID؟</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* User ID */}
            <div className="sm:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">معرف اللاعب (User ID)</label>
              <input
                type="text"
                placeholder="مثال: 12345678"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setVerifiedName(null);
                  setVerifyError(null);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all font-mono"
              />
            </div>

            {/* Zone ID */}
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">رقم السيرفر (Zone ID)</label>
              <input
                type="text"
                placeholder="مثال: 2024"
                value={zoneId}
                onChange={(e) => {
                  setZoneId(e.target.value);
                  setVerifiedName(null);
                  setVerifyError(null);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all font-mono"
              />
            </div>

            {/* Verification Button */}
            <div className="sm:col-span-3">
              <button
                onClick={handleVerifyPlayer}
                disabled={verifying || !userId || !zoneId}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>تحقق من الحساب</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification feedback */}
          {verifiedName && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                تم التحقق بنجاح! اسم الحساب داخل اللعبة:{" "}
                <strong className="font-bold text-white underline">{verifiedName}</strong>
              </span>
            </div>
          )}

          {verifyError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}
        </section>

        {/* Step 2: Choose Package Section */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-extrabold text-sm border border-purple-500/30">
                2
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">اختر الباقة المطلوبة</h2>
                <p className="text-xs text-slate-400">
                  جميع الأسعار محدثة ومطابقة لقوائم وهوامش البوستر المعتمد
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن باقة أو جواهر..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-400 outline-none"
              />
            </div>
          </div>

          {/* Categories Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as PackageCategory | "all")}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/15"
                      : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredPackages.map((p) => {
              const isDouble = p.category === "double_diamonds";
              const isPass = p.category === "weekly_pass";
              const isBundle = p.category === "bundles";

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPackage(p)}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 cursor-pointer overflow-hidden ${
                    p.popular
                      ? "border-cyan-500/40 bg-gradient-to-b from-[#0e172e] to-[#0a0f1d] hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/25 -translate-y-0.5"
                      : "border-slate-800/90 bg-[#0a0f1d]/90 hover:border-slate-700 hover:bg-[#0e1428] hover:-translate-y-0.5"
                  }`}
                >
                  {/* Glowing corner accent */}
                  <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />

                  {/* Badge */}
                  {p.badge && (
                    <span className="absolute top-2 left-2 rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[9px] font-bold text-cyan-300 shadow-sm">
                      {p.badge}
                    </span>
                  )}

                  {/* Top: Icon & Diamond count */}
                  <div className="pt-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 group-hover:scale-110 transition-transform">
                      {isPass ? (
                        <Calendar className="h-5 w-5 text-purple-400" />
                      ) : isDouble ? (
                        <Sparkles className="h-5 w-5 text-amber-400" />
                      ) : isBundle ? (
                        <Package className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Gem className="h-5 w-5 text-cyan-400" />
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {p.name}
                    </h3>

                    {p.bonusDiamonds ? (
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold mt-0.5">
                        <span>{p.diamonds}</span>
                        <span className="text-emerald-400">+{p.bonusDiamonds} إضافي</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {p.diamonds > 0
                          ? `${p.diamonds} جوهرة`
                          : p.description?.slice(0, 25) || "باقة مميزة"}
                      </p>
                    )}
                  </div>

                  {/* Bottom: Pricing & Action */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-base font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                          {p.retailPriceEgp}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">EGP</span>
                        </div>
                        <div className="text-[10px] text-slate-400">≈ {p.retailPriceUsdt} USDT</div>
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPackages.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
              <Gem className="mx-auto h-12 w-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-300">
                لم يتم العثور على باقات تطابق بحثك
              </h3>
              <p className="text-xs text-slate-500 mt-1">جرب البحث بكلمات أخرى أو تغيير التصنيف.</p>
            </div>
          )}
        </section>

        {/* Poster / Rates Comparison Card */}
        <section className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-[#0c1022] via-[#140e2b] to-[#0c1022] p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 border border-purple-500/40 px-3 py-1 text-xs text-purple-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>عروض الجملة والتجار</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                هل أنت تاجر أو صاحب متجر شحن ألعاب؟
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                وفر حتى 15% على جميع باقات وجواهر Mobile Legends عبر بوابتنا المخصصة للتاجر بأسعار
                الجملة المعتمدة وتنفيذ فوري عبر FazerCards.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-start md:justify-end">
              <a
                href="/merchant"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-3 text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
              >
                <span>دخول بوابة التاجر</span>
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-[#05070e] py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">MLBB TOP-UP HUB</span>
            <span>•</span>
            <span>جميع الحقوق محفوظة {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>سعر الصرف المعتمد: 1 USDT = {settings.usdtToEgpRate} EGP</span>
            <span>•</span>
            <a href="/admin" className="hover:text-cyan-400 transition-colors">
              إعدادات النظام
            </a>
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        pkg={selectedPackage}
        userId={userId}
        zoneId={zoneId}
        username={verifiedName || undefined}
        isMerchant={false}
      />

      {/* Guide Modal */}
      <PlayerIdGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}
