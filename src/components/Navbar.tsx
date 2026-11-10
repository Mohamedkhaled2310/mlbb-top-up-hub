import { Link, useRouterState } from "@tanstack/react-router";
import { Gamepad2, Shield, Store, Zap } from "lucide-react";
import { useStore } from "../lib/store/useStore";

export function Navbar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { settings } = useStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-[#080c16]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0b0f1d]">
              <Gamepad2 className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-white text-base sm:text-lg">
                MLBB <span className="text-cyan-400">HUB</span>
              </span>
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400">شحن فوري بالعملات الرقمية</span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              currentPath === "/"
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/20"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Store className="h-4 w-4" />
            <span>المتجر للزبائن</span>
          </Link>

          <Link
            to="/merchant"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              currentPath === "/merchant"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>بوابة التاجر (الجملة)</span>
          </Link>

          <Link
            to="/admin"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              currentPath === "/admin"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">لوحة الإدارة</span>
            <span className="sm:hidden">الإدارة</span>
          </Link>
        </nav>

        {/* Currency badge / Rate */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">سعر الصرف:</span>
          <span className="font-semibold text-cyan-400">
            1 USDT = {settings.usdtToEgpRate.toFixed(2)} EGP
          </span>
        </div>
      </div>
    </header>
  );
}
