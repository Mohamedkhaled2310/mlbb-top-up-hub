type FooterProps = {
  className?: string;
};

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer
      className={`border-t border-slate-800/80 bg-[#04060c] py-6 sm:py-8 pb-24 md:pb-8 text-xs text-slate-400 ${className}`.trim()}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-start">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
          <span className="font-extrabold text-white">METO STORE</span>
          <span className="hidden sm:inline">•</span>
          <span>نشاطاتنا تميزنا ثقة ♡</span>
          <span className="hidden sm:inline">•</span>
          <span>واتساب: 01070459339</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-slate-500">
          <span>شحن آلي فوري ومشفر 100%</span>
          <span className="text-slate-700">•</span>
          <a
            href="/admin"
            className="text-slate-600 hover:text-slate-400 transition-colors text-[11px]"
            title="بوابة دخول المشرف (محمية)"
          >
            🔒 المشرف
          </a>
        </div>
      </div>
    </footer>
  );
}
