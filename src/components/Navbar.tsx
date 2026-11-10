import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Store,
  Zap,
  MessageCircle,
  Menu,
  X,
  Image as ImageIcon,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Gamepad2,
} from "lucide-react";
import { useStore } from "../lib/store/useStore";
import metoLogo from "../assets/meto-logo.jpg";
import metoPoster from "../assets/meto-poster.jpg";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { PlayerIdGuideModal } from "./PlayerIdGuideModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "./ui/sheet";

export function Navbar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { settings } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [posterOpen, setPosterOpen] = useState<boolean>(false);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  // Notice: Admin button is removed from public navigation as requested!
  const navLinks = [
    {
      to: "/",
      label: "متجر الزبائن",
      shortLabel: "المتجر",
      icon: Store,
      activeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/20",
      activeBottom: "text-rose-400 font-bold",
    },
    {
      to: "/merchant",
      label: "بوابة التاجر (الجملة)",
      shortLabel: "التاجر",
      icon: Zap,
      activeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20",
      activeBottom: "text-purple-400 font-bold",
    },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-rose-500/20 bg-[#070a14]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Brand Logo & Name */}
          <Link to="/" className="group flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-500 p-0.5 shadow-md shadow-rose-600/30 transition-transform group-hover:scale-105">
              <img
                src={metoLogo}
                alt="METO STORE Logo"
                className="h-full w-full rounded-[10px] object-cover bg-white"
              />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-[8px] font-black text-slate-950 shadow">
                M
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-black tracking-wider text-white text-xs sm:text-base">
                  METO <span className="text-rose-500">STORE</span>
                </span>
                <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[8px] sm:text-[9px] font-bold text-rose-300 border border-rose-500/30">
                  MLBB
                </span>
              </div>
              <span className="text-[9px] text-slate-400 hidden sm:block">
                متجر الشحن الرسمي والمعتمد
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all border ${
                    isActive
                      ? item.activeColor
                      : "border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Quick Poster Action on Desktop */}
            <button
              onClick={() => setPosterOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50 px-3 py-2 text-xs font-semibold text-cyan-300 transition-all cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>بوستر الأسعار</span>
            </button>
          </nav>

          {/* Right actions: WhatsApp, Exchange Rate & Mobile Menu Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Exchange Rate pill */}
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/80 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-slate-300 shrink-0">
              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-slate-400 hidden sm:inline">الصرف:</span>
              <span className="font-mono font-bold text-rose-400">
                {settings.usdtToEgpRate} <span className="text-[9px] sm:text-[10px] text-slate-400">EGP</span>
              </span>
            </div>

            {/* WhatsApp Link */}
            <a
              href="https://wa.me/201070459339"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 p-2 sm:px-2.5 sm:py-1.5 text-xs text-emerald-300 font-bold transition-all shadow-sm shrink-0 active:scale-95"
              title="تواصل مع الدعم الفني عبر واتساب 01070459339"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">01070459339</span>
            </a>

            {/* Mobile Menu List Toggle Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="القائمة الرئيسية"
                  className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[85vw] max-w-sm bg-[#090d1c] border-l border-rose-500/30 text-slate-100 p-0 flex flex-col justify-between"
              >
                <div>
                  {/* Drawer Header */}
                  <SheetHeader className="p-4 border-b border-slate-800 text-right">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-500 p-0.5 shadow-md">
                        <img
                          src={metoLogo}
                          alt="METO STORE Logo"
                          className="h-full w-full rounded-[10px] object-cover bg-white"
                        />
                      </div>
                      <div className="text-right">
                        <SheetTitle className="text-white font-black text-base flex items-center gap-1.5">
                          METO <span className="text-rose-500">STORE</span>
                        </SheetTitle>
                        <p className="text-[11px] text-slate-400">متجر الشحن الرسمي والمعتمد</p>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Drawer Navigation Links */}
                  <div className="p-4 space-y-2 text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                      أقسام المتجر
                    </p>

                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        currentPath === "/"
                          ? "border-rose-500/50 bg-rose-500/15 text-rose-300 font-bold"
                          : "border-slate-800 bg-[#0c1224] text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">متجر الزبائن</div>
                          <div className="text-[10px] text-slate-400">شحن فوري بالمعرف ID</div>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </Link>

                    <Link
                      to="/merchant"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        currentPath === "/merchant"
                          ? "border-purple-500/50 bg-purple-500/15 text-purple-300 font-bold"
                          : "border-slate-800 bg-[#0c1224] text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">بوابة التاجر (الجملة)</div>
                          <div className="text-[10px] text-slate-400">أسعار الجملة للتجار والمتاجر</div>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </Link>

                    {/* Poster Action */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setPosterOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-cyan-500/30 bg-[#0c1224] text-slate-200 hover:bg-cyan-950/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-cyan-300">بوستر الأسعار الرسمي</div>
                          <div className="text-[10px] text-slate-400">عرض البوستر بدقة كاملة</div>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>

                    {/* Player ID Guide */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setGuideOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#0c1224] text-slate-300 hover:bg-slate-800/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                          <HelpCircle className="h-4 w-4" />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">أين أجد معرف الحساب؟</div>
                          <div className="text-[10px] text-slate-400">شرح استخراج User ID و Zone ID</div>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>

                    {/* WhatsApp Direct Support */}
                    <a
                      href="https://wa.me/201070459339"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">الدعم الفني عبر واتساب</div>
                          <div className="text-[10px] text-emerald-400 font-mono">01070459339</div>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-emerald-500" />
                    </a>
                  </div>

                  {/* Exchange rate info card */}
                  <div className="mx-4 p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">سعر الصرف المعتمد:</span>
                      <span className="font-mono font-bold text-rose-400">1 USDT = {settings.usdtToEgpRate} EGP</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>تحديث لحظي لأسعار التحويل بالجنيه المصري</span>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 text-center">
                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                    <span>مرخص ومعتمد من FazerCards & Binance Pay</span>
                  </div>
                  <p className="text-[10px] text-slate-600">METO STORE © 2026 - جميع الحقوق محفوظة</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible only on < md screens) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-rose-500/20 bg-[#070a14]/95 backdrop-blur-2xl md:hidden px-2 py-1.5 shadow-2xl"
      >
        <div className="grid grid-cols-4 items-center">
          {/* 1. Store */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              currentPath === "/" ? "text-rose-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div
              className={`p-1 rounded-lg ${
                currentPath === "/" ? "bg-rose-500/20 border border-rose-500/30" : ""
              }`}
            >
              <Store className="h-4 w-4" />
            </div>
            <span className="text-[10px] mt-0.5">المتجر</span>
          </Link>

          {/* 2. Merchant */}
          <Link
            to="/merchant"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              currentPath === "/merchant" ? "text-purple-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div
              className={`p-1 rounded-lg ${
                currentPath === "/merchant" ? "bg-purple-500/20 border border-purple-500/30" : ""
              }`}
            >
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-[10px] mt-0.5">التاجر</span>
          </Link>

          {/* 3. Poster */}
          <button
            onClick={() => setPosterOpen(true)}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg">
              <ImageIcon className="h-4 w-4" />
            </div>
            <span className="text-[10px] mt-0.5">البوستر</span>
          </button>

          {/* 4. WhatsApp */}
          <a
            href="https://wa.me/201070459339"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1 rounded-xl text-emerald-400 hover:text-emerald-300 transition-all"
          >
            <div className="p-1 rounded-lg">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="text-[10px] mt-0.5">واتساب</span>
          </a>
        </div>
      </nav>

      {/* Poster High-Res Modal from Navbar */}
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

      {/* Guide Modal from Navbar */}
      <PlayerIdGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
