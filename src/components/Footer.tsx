type FooterProps = {
  className?: string;
};

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer
      className={`w-full border-t border-slate-800/80 bg-[#04060c] text-xs sm:text-sm text-slate-400 ${className}`.trim()}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3">
          <span className="font-extrabold text-white text-base sm:text-lg tracking-wide">METO STORE</span>
          <span>نشاطاتنا تميزنا ثقة ♡</span>
          <a href="https://wa.me/201070459339" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">واتساب: 01070459339</a>
          <span className="text-slate-500 text-[11px] sm:text-xs">شحن آلي فوري ومشفر 100%</span>
          <div className="pt-2 border-t border-slate-800/60 mt-1 w-full max-w-md flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs text-slate-500">
            <span>© {new Date().getFullYear()} METO STORE — جميع الحقوق محفوظة</span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <a href="/admin" className="text-slate-600 hover:text-slate-400 transition-colors" title="بوابة دخول المشرف (محمية)">🔒 دخول المشرف</a>
          </div>
        </div>
      </div>
      {/* spacer for mobile fixed cart bar */}
      <div className="h-20 sm:h-16 md:h-4" aria-hidden="true" />
    </footer>
  );
}
