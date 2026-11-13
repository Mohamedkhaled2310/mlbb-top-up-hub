import { Globe2, Headphones, ShieldCheck, Sparkles, Zap } from "lucide-react";
import metoLogo from "../assets/meto-logo.webp";

type FooterProps = {
  className?: string;
};

export function Footer({ className = "" }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      dir="rtl"
      className={`w-full border-t border-slate-800/80 bg-gradient-to-b from-[#070a14] to-[#04060c] text-slate-400 ${className}`.trim()}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand Column */}
          <div className="space-y-3 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-500 p-0.5 shadow-lg shadow-rose-950/40 shrink-0">
                <img
                  src={metoLogo}
                  alt="METO STORE"
                  className="h-full w-full rounded-[10px] object-cover bg-white"
                />
              </div>
              <div>
                <h2 className="font-extrabold text-white text-base sm:text-lg tracking-wide">METO STORE</h2>
                <p className="text-[11px] text-amber-300/90 font-semibold">نشاطاتنا تميزنا ثقة ♡</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              منصة شحن الألعاب الرقمية المعتمدة بالتكامل المباشر مع مزودي الخدمة الرسميين لتسليم فوري على مدار الساعة.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>شحن آلي فوري ومشفر 100%</span>
            </div>
          </div>

          {/* Supported Games */}
          <div className="space-y-3 col-span-1">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>الألعاب المدعومة</span>
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Mobile Legends (MLBB)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>PUBG Mobile (UC)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>Free Fire Diamonds</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span>Honor of Kings (HOK)</span>
              </li>
            </ul>
          </div>

          {/* Quick Links & Portals */}
          <div className="space-y-3 col-span-1">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-cyan-400" />
              <span>روابط سريعة وبوابات النظام</span>
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/" className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <span>المتجر الرئيسي والشحن الفوري</span>
                </a>
              </li>
              <li>
                <a
                  href="/merchant"
                  className="text-slate-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>بوابة التجار والعملات المتعددة</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3 col-span-2 lg:col-span-1">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-emerald-400" />
              <span>الدعم الفني وخدمة العملاء</span>
            </h3>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                متاحون على مدار الساعة لمساعدتك في طلبات الشحن وتفعيل حسابات التجار.
              </p>
              <a
                href="https://wa.me/201070459339"
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors"
              >
                <span>واتساب: 01070459339</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-500">
          <span>© {year} METO STORE — جميع الحقوق محفوظة</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحديث تلقائي للباقات وأسعار الصرف</span>
            </span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span>MLBB • PUBG • Free Fire • HOK</span>
          </div>
        </div>
      </div>

      {/* Spacer for mobile fixed cart bar */}
      <div className="h-20 sm:h-16 md:h-2" aria-hidden="true" />
    </footer>
  );
}
