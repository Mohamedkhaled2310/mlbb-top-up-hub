type FooterProps = {
  className?: string;
};

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer
      className={`w-full border-t border-slate-800/80 bg-[#04060c] text-xs sm:text-sm text-slate-400 ${className}`.trim()}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-start">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="font-extrabold text-white text-sm sm:text-base tracking-wide">METO STORE</span>
            <span className="text-slate-400">نشاطاتنا تميزنا ثقة ♡</span>
          </div>
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <a href="https://wa.me/201070459339" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">واتساب: 01070459339</a>
            <span className="text-slate-500 text-[11px] sm:text-xs">شحن آلي فوري ومشفر 100%</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col items-center gap-2 text-[11px] sm:text-xs text-slate-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} METO STORE — جميع الحقوق محفوظة</span>
          <a href="/admin" className="text-slate-600 hover:text-slate-400 transition-colors" title="بوابة دخول المشرف (محمية)">🔒 دخول المشرف</a>
        </div>
      </div>
      {/* spacer for mobile fixed cart bar */}
      <div className="h-20 sm:h-16 md:h-4" aria-hidden="true" />
    </footer>
  );
}