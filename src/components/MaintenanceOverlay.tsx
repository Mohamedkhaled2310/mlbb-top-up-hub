import { Wrench, Clock, ShieldAlert, Sparkles, MessageCircle } from "lucide-react";

export default function MaintenanceOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070914] text-slate-100 p-4 font-sans select-none overflow-y-auto">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg w-full bg-[#0b1020]/95 border border-purple-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Logo and Icon Header */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 opacity-20 animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 text-white">
            <Wrench className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        {/* Brand & Badge */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>METO STORE • تحديثات وتطويرات كبرى</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            المتجر تحت الصيانة والتحديث
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            نقوم حالياً بإجراء ترقيات شاملة لتحسين سرعة وأداء خدمات الشحن وتوفير تجربة أفضل وأسرع لجميع التجار والعملاء.
          </p>
        </div>

        {/* Time Notice Card */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs sm:text-sm text-amber-200 space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-amber-300">
            <Clock className="w-4 h-4" />
            <span>موعد عودة الخدمة</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            سيتم استئناف كافة خدمات الشحن وفتح الموقع بشكل كامل وطبيعي <b>صباح الغد</b> بإذن الله.
          </p>
        </div>

        {/* Security Assurance */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>كافة الأرصدة والبيانات ومحافظ التجار في أمان تام ومحفوظة.</span>
        </div>

        {/* Support link */}
        <div className="pt-2 border-t border-slate-800">
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>تواصل مع الدعم الفني للاستفسارات العاجلة</span>
          </a>
        </div>
      </div>
    </div>
  );
}
