import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { CheckoutModal } from "../components/CheckoutModal";
import { PlayerIdGuideModal } from "../components/PlayerIdGuideModal";
import { GamePackageIcon } from "../components/GamePackageIcon";
import { useStore } from "../lib/store/useStore";
import { TopUpPackage, PackageCategory } from "../types/store";
import { validatePlayerApi } from "../lib/api-client";
import metoPoster from "../assets/meto-poster.jpg";
import metoLogo from "../assets/meto-logo.jpg";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Gem,
  PackageCheck,
  TrendingDown,
  Layers,
  History,
  Copy,
  Check,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

export const Route = createFileRoute("/merchant")({
  component: MerchantPage,
});

function MerchantPage() {
  const { packages, settings, orders } = useStore();

  // Fast Top-Up Form state
  const [userId, setUserId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [selectedPackageId, setSelectedPackageId] = useState<string>(packages[0]?.id || "");
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory | "all">("all");

  // Modals
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);
  const [posterOpen, setPosterOpen] = useState<boolean>(false);
  const [copiedTradeNo, setCopiedTradeNo] = useState<string | null>(null);

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) || packages[0];

  // Validate Player
  const handleVerifyPlayer = async () => {
    if (!userId.trim() || !zoneId.trim()) {
      setVerifyError("يرجى إدخال معرف اللاعب ورقم السيرفر");
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
        setVerifyError(res.error || "تعذر التحقق من الحساب");
      }
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : "حدث خطأ في الاتصال");
    } finally {
      setVerifying(false);
    }
  };

  // Submit Fast Top-Up
  const handleStartPayment = () => {
    if (!userId.trim() || !zoneId.trim()) {
      setVerifyError("يرجى إدخال معرف اللاعب (User ID) ورقم السيرفر (Zone ID)");
      return;
    }
    setCheckoutOpen(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTradeNo(text);
    setTimeout(() => setCopiedTradeNo(null), 2000);
  };

  // Filter packages
  const filteredPackages = packages.filter((pkg) => {
    if (!pkg.active && pkg.active !== undefined) return false;
    return selectedCategory === "all" || pkg.category === selectedCategory;
  });

  const merchantOrders = orders.filter((o) => o.isMerchantOrder);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      <Navbar />

      {/* Merchant Header Bar */}
      <div className="border-b border-purple-500/20 bg-gradient-to-r from-[#0d0f21] via-[#150e2a] to-[#0d0f21] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-600 to-rose-500 p-0.5 shadow-lg shadow-purple-950/40">
              <img
                src={metoLogo}
                alt="METO STORE Logo"
                className="h-full w-full rounded-[14px] object-cover bg-white"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-950/40 px-3 py-1 text-xs text-purple-300 mb-1">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
                <span>بوابة تجار التجزئة والموزعين المعتمدة (B2B Portal)</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white">
                بوابة التاجر • <span className="text-purple-400">أسعار الجملة المعتمدة</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                تنفيذ فوري مباشر عبر FazerCards وسداد فوري مشفر بـ Binance Pay بهوامش ربح تجارية
                مخفضة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPosterOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 px-3.5 py-3 text-xs font-bold transition-all shadow-sm"
            >
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <span>عرض بوستر الأسعار</span>
            </button>
            <div className="rounded-xl border border-purple-500/30 bg-[#120f26] p-3 text-right">
              <span className="text-[11px] text-slate-400 block">سعر صرف الجملة:</span>
              <span className="text-base font-extrabold text-purple-300">
                1 USDT = {settings.usdtToEgpRate} EGP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full space-y-8 pb-24 md:pb-12">
        {/* Section 1: Fast Top-Up Panel */}
        <section className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#0e1224] to-[#090d1a] p-6 sm:p-8 shadow-xl shadow-purple-950/30">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">نموذج الشحن السريع للتاجر</h2>
                <p className="text-xs text-slate-400">
                  أدخل بيانات العميل واختر الباقة بسعر الجملة المخفض
                </p>
              </div>
            </div>

            <button
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200"
            >
              <HelpCircle className="h-4 w-4" />
              <span>إرشادات مكان المعرف</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Player Inputs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    معرف اللاعب (User ID)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 98765432"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      setVerifiedName(null);
                      setVerifyError(null);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    رقم السيرفر (Zone ID)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 2105"
                    value={zoneId}
                    onChange={(e) => {
                      setZoneId(e.target.value);
                      setVerifiedName(null);
                      setVerifyError(null);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Verify button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleVerifyPlayer}
                  disabled={verifying || !userId || !zoneId}
                  className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري الفحص...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>تحقق من اسم الحساب</span>
                    </>
                  )}
                </button>
              </div>

              {verifiedName && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>
                    اسم الحساب المسجل: <strong>{verifiedName}</strong>
                  </span>
                </div>
              )}

              {verifyError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Package Selector Dropdown */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-300">اختر باقة الشحن:</label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white focus:border-purple-400 outline-none cursor-pointer"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — بسعر الجملة: {pkg.merchantPriceEgp} EGP (${pkg.merchantPriceUsdt}{" "}
                      USDT) [سعر العميل: {pkg.retailPriceEgp} EGP]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Wholesale Summary & Payment Card */}
            <div className="lg:col-span-5 rounded-xl border border-purple-500/30 bg-gradient-to-b from-[#13102a] to-[#0d0c1c] p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-purple-400" />
                <span>ملخص عملية التاجر</span>
              </h3>

              {selectedPkg && (
                <div className="space-y-3 text-xs border-y border-slate-800/80 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">الباقة المختارة:</span>
                    <div className="flex items-center gap-2">
                      <GamePackageIcon
                        category={selectedPkg.category}
                        diamonds={selectedPkg.diamonds}
                        bonusDiamonds={selectedPkg.bonusDiamonds}
                        size="sm"
                      />
                      <span className="font-bold text-white">{selectedPkg.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">كمية الجواهر:</span>
                    <span className="font-bold text-purple-400">
                      {selectedPkg.diamonds + (selectedPkg.bonusDiamonds || 0)} جوهرة
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">سعر البيع للجمهور:</span>
                    <span className="line-through text-slate-500">
                      {selectedPkg.retailPriceEgp} EGP
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                    <span className="text-slate-300 font-semibold">إجمالي سعر الجملة:</span>
                    <div className="text-right">
                      <div className="text-xl font-black text-purple-300">
                        {selectedPkg.merchantPriceEgp} EGP
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ({selectedPkg.merchantPriceUsdt} USDT)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/30">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>
                      وفرت{" "}
                      <strong>
                        {selectedPkg.retailPriceEgp - selectedPkg.merchantPriceEgp} EGP
                      </strong>{" "}
                      (هامش ربح للتاجر)
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartPayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-3.5 px-4 text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>بدء الدفع وتوليد QR Code لـ Binance Pay</span>
              </button>

              <p className="text-[10px] text-slate-400 text-center">
                يتم فحص السداد آلياً، وفور التحقق يتم استدعاء FazerCards لشحن المعرف فوراً.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: All Wholesale Packages Table */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-400" />
                <span>قائمة جميع الباقات بأسعار الجملة</span>
              </h2>
              <p className="text-xs text-slate-400">
                مقارنة أسعار الجملة المخصصة للتاجر مقابل أسعار الجمهور
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "all", label: "الكل" },
                { id: "diamonds", label: "الجواهر" },
                { id: "weekly_pass", label: "الويكلي" },
                { id: "double_diamonds", label: "الدبل x2" },
                { id: "bundles", label: "الحزم" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id as PackageCategory | "all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === c.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0a0f1d]">
            <table className="w-full text-right text-xs min-w-[620px]">
              <thead className="bg-[#0e1428] text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">اسم الباقة</th>
                  <th className="p-3.5">رمز FazerCards</th>
                  <th className="p-3.5">الجواهر</th>
                  <th className="p-3.5">سعر الجملة (EGP)</th>
                  <th className="p-3.5">سعر الجملة (USDT)</th>
                  <th className="p-3.5">سعر الجمهور (EGP)</th>
                  <th className="p-3.5">ربحك المقدر</th>
                  <th className="p-3.5 text-center">شحن سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPackages.map((pkg) => {
                  const profit = pkg.retailPriceEgp - pkg.merchantPriceEgp;
                  return (
                    <tr key={pkg.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <GamePackageIcon
                          category={pkg.category}
                          diamonds={pkg.diamonds}
                          bonusDiamonds={pkg.bonusDiamonds}
                          size="sm"
                        />
                        <span>{pkg.name}</span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {pkg.fazerProductId}
                      </td>
                      <td className="p-3.5 font-semibold text-cyan-300">
                        {pkg.diamonds + (pkg.bonusDiamonds || 0)}
                      </td>
                      <td className="p-3.5 font-bold text-purple-300 text-sm">
                        {pkg.merchantPriceEgp} EGP
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">${pkg.merchantPriceUsdt}</td>
                      <td className="p-3.5 text-slate-400 line-through">
                        {pkg.retailPriceEgp} EGP
                      </td>
                      <td className="p-3.5 text-emerald-400 font-bold">+{profit} EGP</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            window.scrollTo({ top: 120, behavior: "smooth" });
                          }}
                          className="rounded-lg bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white px-3 py-1 font-semibold text-[11px] transition-all"
                        >
                          اختيار
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Recent Merchant Orders History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-purple-400" />
              <span>سجل شحنات التاجر الأخيرة</span>
            </h2>
            <span className="text-xs text-slate-400">{merchantOrders.length} معاملة مسجلة</span>
          </div>

          {merchantOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
              لم تقم بأي عمليات شحن تاجر حتى الآن. قم بعملية شحن من النموذج أعلاه لتظهر تفاصيلها
              وأرقام المعاملات هنا.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0a0f1d]">
              <table className="w-full text-right text-xs min-w-[620px]">
                <thead className="bg-[#0e1428] text-slate-300 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">رقم الطلب</th>
                    <th className="p-3.5">معرف اللاعب</th>
                    <th className="p-3.5">الباقة</th>
                    <th className="p-3.5">المبلغ (USDT)</th>
                    <th className="p-3.5">معاملة Binance</th>
                    <th className="p-3.5">معاملة FazerCards</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {merchantOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/50">
                      <td className="p-3.5 font-mono text-cyan-300">{ord.id}</td>
                      <td className="p-3.5 font-mono">
                        {ord.userId} ({ord.zoneId})
                      </td>
                      <td className="p-3.5 font-semibold text-white">{ord.packageName}</td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">
                        ${ord.priceUsdt}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        <button
                          onClick={() => handleCopy(ord.binanceTradeNo)}
                          className="flex items-center gap-1 hover:text-white"
                        >
                          <span>{ord.binanceTradeNo.slice(0, 14)}...</span>
                          {copiedTradeNo === ord.binanceTradeNo ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-purple-300">
                        {ord.fazerTransactionId || "—"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            ord.status === "SUCCESS"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : ord.status === "FAILED"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {ord.status === "SUCCESS"
                            ? "مكتمل"
                            : ord.status === "FAILED"
                              ? "فشل"
                              : "قيد المعالجة"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {new Date(ord.createdAt).toLocaleTimeString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Checkout Modal in Merchant mode */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        pkg={selectedPkg}
        userId={userId}
        zoneId={zoneId}
        username={verifiedName || undefined}
        isMerchant={true}
      />

      <PlayerIdGuideModal open={guideOpen} onOpenChange={setGuideOpen} />

      {/* Poster High-Res Modal */}
      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0e1c] border border-purple-500/40 text-slate-100 p-4 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <span>بوستر أسعار METO STORE المعتمد</span>
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
