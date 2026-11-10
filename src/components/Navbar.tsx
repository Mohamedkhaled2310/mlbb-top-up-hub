import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Store, Zap, MessageCircle } from "lucide-react";
import { useStore } from "../lib/store/useStore";
import metoLogo from "../assets/meto-logo.jpg";

export function Navbar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { settings } = useStore();

  const navLinks = [
    {
      to: "/",
      label: "متجر الزبائن",
      shortLabel: "المتجر",
      icon: Store,
      activeColor: "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20",
      activeBottom: "text-rose-400",
    },
    {
      to: "/merchant",
      label: "بوابة التاجر (الجملة)",
      shortLabel: "التاجر",
      icon: Zap,
      activeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20",
      activeBottom: "text-purple-400",
    },
    {
      to: "/admin",
      label: "لوحة الإدارة",
      shortLabel: "الإدارة",
      icon: Shield,
      activeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20",
      activeBottom: "text-amber-400",
    },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-rose-500/20 bg-[#070a14]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Brand Logo & Name */}
          <Link to="/" className="group flex items-center gap-2.5 shrink-0">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-500 p-0.5 shadow-md shadow-rose-600/30 transition-transform group-hover:scale-105">
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
                <span className="font-black tracking-wider text-white text-sm sm:text-base">
                  METO <span className="text-rose-500">STORE</span>
                </span>
                <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300 border border-rose-500/30">
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
          </nav>

          {/* Right actions: WhatsApp & Exchange Rate */}
          <div className="flex items-center gap-2">
            {/* WhatsApp Link */}
            <a
              href="https://wa.me/201070459339"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 px-2.5 py-1.5 text-xs text-emerald-300 font-bold transition-all shadow-sm"
              title="تواصل مع الدعم الفني عبر واتساب"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">01070459339</span>
            </a>

            {/* Exchange Rate pill */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/80 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs text-slate-300">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-slate-400 hidden sm:inline">الصرف:</span>
              <span className="font-mono font-bold text-rose-400">
                {settings.usdtToEgpRate} EGP
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible only on < md screens) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-rose-500/20 bg-[#070a14]/95 backdrop-blur-2xl md:hidden px-2 py-1 shadow-2xl"
      >
        <div className="flex items-center justify-around">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? `${item.activeBottom} font-bold scale-105`
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isActive ? "bg-rose-500/20 border border-rose-500/30" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
