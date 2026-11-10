import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { CheckoutModal } from "../components/CheckoutModal";
import { PlayerIdGuideModal } from "../components/PlayerIdGuideModal";
import { GamesSection } from "../components/GamesSection";
import { GamePackageIcon } from "../components/GamePackageIcon";
import { useStore } from "../lib/store/useStore";
import { TopUpPackage, PackageCategory } from "../types/store";
import { validatePlayerApi } from "../lib/api-client";
import metoPoster from "../assets/meto-poster.jpg";
import metoLogo from "../assets/meto-logo.jpg";
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
  Image as ImageIcon,
  MessageCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

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
  const [posterOpen, setPosterOpen] = useState<boolean>(false);

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
    { id: "bundles", label: "الحزم (The Bundle)", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-[#070914] text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
      <Navbar />

      {/* Hero Section with METO STORE Branding */}
      <div className="relative overflow-hidden border-b border-rose-500/20">
        {/* Background Image & Lighting */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen scale-105 filter blur-[2px]"
          style={{ backgroundImage: `url(${metoPoster})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070914] via-[#070914]/90 to-[#070914]/70" />
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-rose-600/15 blur-[130px] pointer-events-none" />
        <div className="absolute top-10 right-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-[130px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 text-center">
          {/* Brand Logo & Slogans from the poster */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-400 p-1 shadow-2xl shadow-rose-600/40">
              <img
                src={metoLogo}
                alt="METO STORE Logo"
                className="h-full w-full rounded-xl object-cover bg-white"
              />
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-[11px] font-black text-white shadow">
                👑
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/40 px-4 py-1 text-xs text-rose-300 backdrop-blur-md shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-rose-400" />
              <span>Your MLBB Top Up Store ♡ • Play More Spend Less ♡</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3">
            <span className="text-rose-500">METO</span> STORE •{" "}
            <span className="meto-gradient-text">MLBB DIAMONDS</span>
          </h1>

          <p className="mx-auto max-w-2xl text-xs sm:text-base text-slate-300 mb-6 leading-relaxed">
            الأسعار الرسمية المعتمدة لمتجر ميتو لشحن ألعاب Mobile Legends: Bang Bang. شحن فوري وآمن
            بالجنيه المصري و USDT عبر FazerCards و Binance Pay.
          </p>

          {/* Quick Buttons: View Original Poster + WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto mb-6 px-1">
            <button
              onClick={() => setPosterOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 py-2.5 px-3 text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <ImageIcon className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>عرض بوستر الأسعار الرسمي</span>
            </button>

            <a
              href="https://wa.me/201070459339"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 py-2.5 px-3 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>الدعم الفني واتساب: 01070459339</span>
            </a>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-2xl mx-auto text-[11px] sm:text-xs text-slate-300 px-1">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1224]/80 p-2.5 backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>شحن آلي وفوري خلال ثوانٍ</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1224]/80 p-2.5 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>دفع مشفر بـ Binance Pay</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1224]/80 p-2.5 backdrop-blur-sm">
              <Gem className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>بطاقات الويكلي وعروض الدبل x2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full space-y-8 pb-24 md:pb-12">
        {/* Games Showcase Section */}
        <GamesSection />

        {/* Step 1: Player ID Card */}
        <section id="player-input-card" className="relative rounded-2xl border border-rose-500/25 bg-[#0a0f20]/90 p-4 sm:p-7 shadow-xl shadow-rose-950/20 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-extrabold text-sm border border-rose-500/30">
                1
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-white flex items-center flex-wrap gap-1.5">
                  <span>أدخل معرف حساب اللاعب</span>
                  <span className="font-mono text-cyan-400 text-xs sm:text-sm font-semibold">
                    (User ID & Zone)
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  تحقق من الاسم داخل اللعبة لتفادي إرسال الشحن لحساب آخر
                </p>
              </div>
            </div>

            <button
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
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
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all font-mono"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all font-mono"
              />
            </div>

            {/* Verification Button */}
            <div className="sm:col-span-3">
              <button
                onClick={handleVerifyPlayer}
                disabled={verifying || !userId || !zoneId}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-bold py-3 px-4 text-xs sm:text-sm transition-all shadow-md shadow-rose-600/25 cursor-pointer"
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
        <section id="packages-section" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-extrabold text-sm border border-cyan-500/30">
                2
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">اختر الباقة المطلوبة</h2>
                <p className="text-xs text-slate-400">
                  قوائم الأسعار مطابقة تماماً لبوستر METO STORE الرسمي (الأسعار بالجنيه المصري و
                  USDT)
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن باقة أو عدد الجواهر..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-400 outline-none"
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
                      ? "bg-gradient-to-r from-rose-500/20 to-cyan-500/20 text-rose-300 border border-rose-500/50 shadow-md shadow-rose-500/15"
                      : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-rose-400" : "text-slate-400"}`} />
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
                      ? "border-rose-500/40 bg-gradient-to-b from-[#170e24] to-[#0a0f1d] hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/25 -translate-y-0.5"
                      : "border-slate-800/90 bg-[#0a0f1d]/90 hover:border-slate-700 hover:bg-[#0e1428] hover:-translate-y-0.5"
                  }`}
                >
                  {/* Glowing corner accent */}
                  <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-rose-500/10 blur-xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />

                  {/* Badge */}
                  {p.badge && (
                    <span className="absolute top-2 left-2 rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[9px] font-bold text-rose-300 shadow-sm">
                      {p.badge}
                    </span>
                  )}

                  {/* Top: Professional 3D Game Asset Icon & Name */}
                  <div className="pt-2">
                    <div className="mb-2.5 flex items-center justify-start group-hover:scale-105 transition-transform">
                      <GamePackageIcon
                        category={p.category}
                        diamonds={p.diamonds}
                        bonusDiamonds={p.bonusDiamonds}
                        size="md"
                      />
                    </div>

                    <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-rose-300 transition-colors">
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
                        <div className="text-base font-black text-white group-hover:text-rose-400 transition-colors">
                          {p.retailPriceEgp}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">EGP</span>
                        </div>
                        <div className="text-[10px] text-slate-400">≈ {p.retailPriceUsdt} USDT</div>
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Poster Callout Banner */}
        <section className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-[#170e22] via-[#0d1428] to-[#170e22] p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs text-rose-300">
                <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                <span>عروض الجملة والتجار</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                هل أنت تاجر أو صاحب متجر شحن ألعاب؟
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                وفر في كل عملية شحن مع بوابة التاجر الرسمية لـ METO STORE بأسعار الجملة المخفضة
                وتنفيذ فوري عبر FazerCards.
              </p>
            </div>
            <div className="md:col-span-4 flex flex-col sm:flex-row md:justify-end gap-2.5">
              <button
                onClick={() => setPosterOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-bold px-4 py-3 text-xs transition-all"
              >
                <ImageIcon className="h-4 w-4" />
                <span>عرض البوستر</span>
              </button>
              <a
                href="/merchant"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold px-5 py-3 text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
              >
                <span>بوابة التاجر</span>
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-[#04060c] py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">METO STORE</span>
            <span>•</span>
            <span>نشاطاتنا تميزنا ثقة ♡</span>
            <span>•</span>
            <span>واتساب: 01070459339</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>سعر الصرف المعتمد: 1 USDT = {settings.usdtToEgpRate} EGP</span>
            <span className="text-slate-600">•</span>
            <a
              href="/admin"
              className="text-slate-600 hover:text-slate-400 transition-colors text-[11px]"
              title="بوابة دخول المشرف (محمية)"
            >
              🔒 المشرف
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

      {/* Poster High-Res Modal */}
      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0e1c] border border-cyan-500/40 text-slate-100 p-4 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              <span>بوستر أسعار METO STORE الرسمي - Mobile Legends</span>
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
    </div>
  );
}
