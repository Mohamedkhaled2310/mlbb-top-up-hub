import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Store, Zap, MessageCircle } from "lucide-react";
import { useStore } from "../lib/store/useStore";
import metoLogo from "../assets/meto-logo.jpg";

export function Navbar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { settings } = useStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-500/20 bg-[#070a14]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-500 p-0.5 shadow-lg shadow-rose-600/30 transition-transform group-hover:scale-105">
            <img
              src={metoLogo}
              alt="METO STORE Logo"
              className="h-full w-full rounded-[10px] object-cover bg-white"
            />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-black text-slate-950 shadow">
              M
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-wider text-white text-base sm:text-lg">
                METO <span className="text-rose-500">STORE</span>
              </span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                MLBB
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              متجر الشحن الرسمي والمعتمد
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
              currentPath === "/"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/20"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Store className="h-4 w-4 text-cyan-400" />
            <span>متجر الزبائن</span>
          </Link>

          <Link
            to="/merchant"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
              currentPath === "/merchant"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4 text-purple-400" />
            <span>بوابة التاجر (الجملة)</span>
          </Link>

          <Link
            to="/admin"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
              currentPath === "/admin"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Shield className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">لوحة الإدارة</span>
            <span className="sm:hidden">الإدارة</span>
          </Link>
        </nav>

        {/* WhatsApp & Exchange Rate */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://wa.me/201070459339"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-2.5 py-1.5 text-xs text-emerald-300 font-bold transition-all shadow-sm"
            title="تواصل مع الدعم عبر واتساب"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden lg:inline">01070459339</span>
          </a>

          <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-400">سعر الصرف:</span>
            <span className="font-semibold text-rose-400">
              1 USDT = {settings.usdtToEgpRate.toFixed(2)} EGP
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
