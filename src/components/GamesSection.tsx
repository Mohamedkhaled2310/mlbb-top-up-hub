import React, { useState } from "react";
import mlbbArena from "../assets/mlbb-arena.jpg";
import metoLogo from "../assets/meto-logo.jpg";
import { Zap, MessageCircle, Sparkles, CheckCircle2, ShieldCheck, Gamepad2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

export interface GameItem {
  id: string;
  name: string;
  subtitle: string;
  publisher: string;
  status: "active" | "order_only" | "soon";
  statusText: string;
  currencyName: string;
  coverImage: string;
  accentColor: string;
  badgeBg: string;
  description: string;
  whatsappMessage?: string;
}

export function GamesSection() {
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameItem | null>(null);

  const games: GameItem[] = [
    {
      id: "mlbb",
      name: "Mobile Legends: Bang Bang",
      subtitle: "اللعبة النشطة - شحن فوري وآلي",
      publisher: "Moonton",
      status: "active",
      statusText: "شحن فوري بالمعرف ⚡",
      currencyName: "Diamonds & Passes",
      coverImage: mlbbArena,
      accentColor: "border-rose-500 shadow-rose-500/30",
      badgeBg: "bg-rose-500 text-white shadow-rose-500/50",
      description: "المتجر الرسمي المعتمد لشحن جواهر MLBB وبطاقات الويكلي وعروض الدبل x2 المزدوجة مباشرة إلى حسابك خلال ثوانٍ.",
    },
    {
      id: "pubg",
      name: "PUBG Mobile (ببجي موبايل)",
      subtitle: "شحن شدات UC الرسمية",
      publisher: "Tencent Games",
      status: "order_only",
      statusText: "متاح بالطلب المباشر 💬",
      currencyName: "Unknown Cash (UC)",
      coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=900&auto=format&fit=crop",
      accentColor: "border-amber-500/50 hover:border-amber-400",
      badgeBg: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
      description: "نوفر شحن شدات ببجي موبايل (UC) الرسمية العالمية والكورية بأفضل أسعار السوق للتجار والزبائن عبر خدمة العملاء مباشرة.",
      whatsappMessage: "السلام عليكم، أريد الاستفسار عن أسعار شحن شدات ببجي موبايل (PUBG UC)",
    },
    {
      id: "freefire",
      name: "Free Fire (فري فاير)",
      subtitle: "جواهر فري فاير بالمعرف ID",
      publisher: "Garena",
      status: "order_only",
      statusText: "متاح بالطلب 💎",
      currencyName: "Garena Diamonds",
      coverImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop",
      accentColor: "border-cyan-500/50 hover:border-cyan-400",
      badgeBg: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40",
      description: "شحن جواهر فري فاير بالـ ID فوري لحسابات الشرق الأوسط وسيرفرات أفريقيا بتخفيضات حصرية.",
      whatsappMessage: "السلام عليكم، أريد الاستفسار عن أسعار شحن جواهر فري فاير (Free Fire)",
    },
    {
      id: "hok",
      name: "Honor of Kings (أونر أوف كينجز)",
      subtitle: "توكنز وباقات الشحن الرسمية",
      publisher: "Level Infinite",
      status: "soon",
      statusText: "قريباً في المتجر 🚀",
      currencyName: "Tokens",
      coverImage: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=900&auto=format&fit=crop",
      accentColor: "border-purple-500/40 hover:border-purple-400",
      badgeBg: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
      description: "جاري ربط باقات Honor of Kings في النظام الآلي لتوفير الشحن المباشر عبر البوابة قريباً.",
      whatsappMessage: "السلام عليكم، متى ستتوفر باقات Honor of Kings في ميتو ستور؟",
    },
  ];

  const handleGameClick = (game: GameItem) => {
    if (game.status === "active") {
      // Scroll to package section
      const elem = document.getElementById("packages-section") || document.getElementById("player-input-card");
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setSelectedGameForModal(game);
    }
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 via-cyan-500/20 to-purple-500/20 border border-rose-500/30 text-rose-400 font-extrabold text-sm shadow-md">
            <Gamepad2 className="h-4 w-4 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>ألعاب المتجر المعتمدة</span>
              <span className="text-[10px] rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5">
                Official Games
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              اختر اللعبة المطلوبة للاطلاع على الباقات والأسعار الرسمية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] text-slate-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>الشحن الفوري نشط الآن لـ MLBB</span>
        </div>
      </div>

      {/* Games Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {games.map((game) => {
          const isActive = game.status === "active";

          return (
            <div
              key={game.id}
              onClick={() => handleGameClick(game)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
                isActive
                  ? "border-rose-500/60 bg-gradient-to-b from-[#1b1228] to-[#0a0f1d] ring-1 ring-rose-500/30 shadow-xl shadow-rose-950/40 -translate-y-1"
                  : "border-slate-800 bg-[#0a0f1d]/80 hover:border-slate-700 hover:bg-[#0f162c] hover:-translate-y-0.5 opacity-90 hover:opacity-100"
              }`}
            >
              {/* Cover Image with gradient overlay */}
              <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-900">
                <img
                  src={game.coverImage}
                  alt={game.name}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/40 to-transparent" />

                {/* Status Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.8 text-[10px] font-bold shadow-md ${game.badgeBg}`}
                  >
                    {isActive && <Zap className="h-3 w-3 fill-current" />}
                    <span>{game.statusText}</span>
                  </span>
                </div>

                {/* Publisher */}
                <div className="absolute bottom-2 right-2.5">
                  <span className="rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-mono text-slate-300 border border-white/10">
                    {game.publisher}
                  </span>
                </div>
              </div>

              {/* Game Info */}
              <div className="p-3.5 space-y-2">
                <div>
                  <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-rose-300 transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {game.subtitle}
                  </p>
                </div>

                {/* Bottom Action Hint */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] font-semibold text-cyan-400">
                    {game.currencyName}
                  </span>

                  {isActive ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 group-hover:underline">
                      <span>عرض الباقات</span>
                      <ArrowLeft className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-emerald-400 transition-colors">
                      <MessageCircle className="h-3 w-3" />
                      <span>طلب عبر واتساب</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Game Details & Order Modal (for non-MLBB games) */}
      <Dialog
        open={!!selectedGameForModal}
        onOpenChange={(open) => !open && setSelectedGameForModal(null)}
      >
        <DialogContent className="max-w-md bg-[#0a0f20] border border-cyan-500/40 text-slate-100 p-5 rounded-2xl">
          {selectedGameForModal && (
            <>
              <DialogHeader className="text-right">
                <div className="relative h-32 -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl border-b border-slate-800">
                  <img
                    src={selectedGameForModal.coverImage}
                    alt={selectedGameForModal.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f20] via-[#0a0f20]/60 to-transparent" />
                  <div className="absolute bottom-3 right-4 flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedGameForModal.badgeBg}`}>
                      {selectedGameForModal.statusText}
                    </span>
                  </div>
                </div>

                <DialogTitle className="text-lg font-bold text-white">
                  {selectedGameForModal.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 leading-relaxed mt-1 text-right">
                  {selectedGameForModal.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>الناشر الرسمي:</span>
                    <strong className="text-white font-mono">{selectedGameForModal.publisher}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>العملة المدعومة:</span>
                    <strong className="text-cyan-300">{selectedGameForModal.currencyName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>طريقة التنفيذ:</span>
                    <strong className="text-emerald-400 font-semibold">بالطلب المباشر من الدعم الفني</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {selectedGameForModal.whatsappMessage && (
                  <a
                    href={`https://wa.me/201070459339?text=${encodeURIComponent(
                      selectedGameForModal.whatsappMessage
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-3 text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>طلب شحن اللعبة عبر واتساب: 01070459339</span>
                  </a>
                )}

                <button
                  onClick={() => setSelectedGameForModal(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
