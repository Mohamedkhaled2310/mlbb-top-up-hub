import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Store, Zap, MessageCircle, Menu, Image as ImageIcon, ChevronLeft } from "lucide-react";
import metoLogo from "../assets/meto-logo.webp";
import metoPoster from "../assets/meto-poster.webp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

export function Navbar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "متجر الزبائن", icon: Store, active: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
    { to: "/merchant", label: "بوابة التاجر", icon: Zap, active: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-rose-500/20 bg-[#070a14]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-500 p-0.5 shadow-md">
              <img src={metoLogo} alt="METO STORE" className="h-full w-full rounded-[10px] object-cover bg-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-wider text-white text-xs sm:text-base">METO <span className="text-rose-500">STORE</span></span>
              <span className="text-[9px] text-slate-400 hidden sm:block">شحن فوري وآمن</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon; const isActive = currentPath === item.to;
              return (
                <Link key={item.to} to={item.to} className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all border ${isActive ? item.active : "border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white"}`}>
                  <Icon className="h-4 w-4" /><span>{item.label}</span>
                </Link>
              );
            })}
            <button onClick={() => setPosterOpen(true)} className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50 px-3 py-2 text-xs font-semibold text-cyan-300">
              <ImageIcon className="h-3.5 w-3.5" /><span>بوستر الأسعار</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <a href="https://wa.me/201070459339" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 p-2 sm:px-2.5 sm:py-1.5 text-xs text-emerald-300 font-bold">
              <MessageCircle className="h-4 w-4 text-emerald-400" /><span className="hidden sm:inline">01070459339</span>
            </a>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button aria-label="القائمة" className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300"><Menu className="h-4 w-4" /></button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm bg-[#090d1c] border-l border-rose-500/30 text-slate-100 p-0 flex flex-col">
                <SheetHeader className="p-4 pe-12 border-b border-slate-800 text-right">
                  <div className="flex items-center gap-3 pe-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-500 p-0.5"><img src={metoLogo} alt="METO" className="h-full w-full rounded-[10px] object-cover bg-white"/></div>
                    <div className="text-right"><SheetTitle className="text-white font-black text-base">METO <span className="text-rose-500">STORE</span></SheetTitle><p className="text-[11px] text-slate-400">شحن فوري وآمن</p></div>
                  </div>
                </SheetHeader>
                <div className="p-4 space-y-2 text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">أقسام المتجر</p>
                  {navLinks.map((item)=>{
                    const Icon=item.icon; const isActive=currentPath===item.to;
                    return (
                      <Link key={item.to} to={item.to} onClick={()=>setMobileMenuOpen(false)} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isActive?item.active:"border-slate-800 bg-[#0c1224] text-slate-300"}`}>
                        <div className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-slate-800"><Icon className="h-4 w-4"/></div><span className="text-sm font-semibold">{item.label}</span></div><ChevronLeft className="h-4 w-4 text-slate-500"/>
                      </Link>
                    );
                  })}
                  <button onClick={()=>{setPosterOpen(true); setMobileMenuOpen(false);}} className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#0c1224] text-slate-300">
                    <div className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400"><ImageIcon className="h-4 w-4"/></div><span className="text-sm font-semibold">بوستر الأسعار</span></div><ChevronLeft className="h-4 w-4 text-slate-500"/>
                  </button>
                  <a href="https://wa.me/201070459339" target="_blank" rel="noreferrer" onClick={()=>setMobileMenuOpen(false)} className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300">
                    <div className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400"><MessageCircle className="h-4 w-4"/></div><span className="text-sm font-semibold">الدعم واتساب</span></div><ChevronLeft className="h-4 w-4 text-emerald-500/70"/>
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0e1c] border border-cyan-500/40 text-slate-100 p-4 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="mb-2"><DialogTitle className="text-base font-bold text-white flex items-center gap-2"><ImageIcon className="h-4 w-4 text-cyan-400"/> بوستر الأسعار</DialogTitle></DialogHeader>
          <div className="rounded-xl overflow-hidden border border-slate-800"><img src={metoPoster} alt="Poster" className="w-full h-auto object-contain"/></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
