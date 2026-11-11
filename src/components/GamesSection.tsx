import React from "react";
import mlbbCover from "../assets/mlbb-cover.jpg";
import pubgCover from "../assets/pubg-cover.jpg";
import freefireCover from "../assets/freefire-cover.jpg";
import hokCover from "../assets/hok-cover.jpg";
import { Zap, Gamepad2, ArrowLeft, Check, Sparkles } from "lucide-react";

export interface GameItem {
  id: string;
  name: string;
  subtitle: string;
  publisher: string;
  statusText: string;
  currencyName: string;
  coverImage: string;
  accentBorder: string;
  badgeBg: string;
  description: string;
}

interface GamesSectionProps {
  selectedGameId?: string;
  onSelectGame?: (gameId: string) => void;
}

export function GamesSection({ selectedGameId = "mlbb", onSelectGame }: GamesSectionProps) {
  const games: GameItem[] = [
    {
      id: "mlbb",
      name: "Mobile Legends: Bang Bang",
      subtitle: "جواهر وبطاقات ويكلي وعروض دبل",
      publisher: "Moonton",
      statusText: "شحن فوري بالمعرف ⚡",
      currencyName: "Diamonds & Passes",
      coverImage: mlbbCover,
      accentBorder: "border-rose-500 shadow-rose-500/40 ring-2 ring-rose-500/50",
      badgeBg: "bg-rose-500 text-white shadow-rose-500/50",
      description: "المتجر الرسمي المعتمد لشحن جواهر MLBB وبطاقات الويكلي وعروض الدبل x2 المزدوجة مباشرة إلى حسابك خلال ثوانٍ.",
    },
    {
      id: "pubg",
      name: "PUBG Mobile (ببجي موبايل)",
      subtitle: "شحن شدات UC الرسمية والرويال باس",
      publisher: "Tencent Games",
      statusText: "شحن فوري بالمعرف ⚡",
      currencyName: "Unknown Cash (UC)",
      coverImage: pubgCover,
      accentBorder: "border-amber-500 shadow-amber-500/40 ring-2 ring-amber-500/50",
      badgeBg: "bg-amber-500 text-slate-950 font-bold shadow-amber-500/50",
      description: "شحن شدات ببجي موبايل (UC) الرسمية العالمية والكورية بأفضل أسعار السوق للتجار والزبائن بالـ Character ID.",
    },
    {
      id: "freefire",
      name: "Free Fire (فري فاير)",
      subtitle: "شحن جواهر فري فاير والعضويات",
      publisher: "Garena",
      statusText: "شحن فوري بالـ ID 💎",
      currencyName: "Garena Diamonds",
      coverImage: freefireCover,
      accentBorder: "border-cyan-500 shadow-cyan-500/40 ring-2 ring-cyan-500/50",
      badgeBg: "bg-cyan-500 text-slate-950 font-bold shadow-cyan-500/50",
      description: "شحن جواهر فري فاير بالـ Player ID فوري لحسابات الشرق الأوسط وسيرفرات أفريقيا بتخفيضات وعضويات حصرية.",
    },
    {
      id: "hok",
      name: "Honor of Kings (أونر أوف كينجز)",
      subtitle: "توكنز وباقات الشحن وتذاكر الأبطال",
      publisher: "Level Infinite",
      statusText: "شحن فوري بالمعرف 🚀",
      currencyName: "Tokens",
      coverImage: hokCover,
      accentBorder: "border-purple-500 shadow-purple-500/40 ring-2 ring-purple-500/50",
      badgeBg: "bg-purple-500 text-white font-bold shadow-purple-500/50",
      description: "باقات شحن توكنز Honor of Kings الرسمية وبطاقات التحدي الأسبوعية بالمعرف مباشرة.",
    },
  ];

  const handleGameClick = (gameId: string) => {
    if (onSelectGame) {
      onSelectGame(gameId);
    }
    // Smooth scroll down to player input card
    setTimeout(() => {
      const elem = document.getElementById("player-input-card") || document.getElementById("packages-section");
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
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
                اختر لعبتك للشحن
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              اضغط على أي لعبة للانتقال فورياً لباقاتها وإدخال رقم حسابك للشحن
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] text-slate-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>الشحن الآلي الفوري نشط لكافة الألعاب</span>
        </div>
      </div>

      {/* Games Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {games.map((game) => {
          const isSelected = selectedGameId === game.id;

          return (
            <div
              key={game.id}
              onClick={() => handleGameClick(game.id)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? `bg-gradient-to-b from-[#1c122a] to-[#0a0f1d] -translate-y-1 ${game.accentBorder}`
                  : "border-slate-800 bg-[#0a0f1d]/80 hover:border-slate-700 hover:bg-[#0f162c] hover:-translate-y-0.5"
              }`}
            >
              {/* Cover Image with gradient overlay */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
                <img
                  src={game.coverImage}
                  alt={game.name}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/40 to-transparent" />

                {/* Status Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.8 text-[10px] font-bold shadow-md ${game.badgeBg}`}
                  >
                    <Zap className="h-3 w-3 fill-current" />
                    <span>{game.statusText}</span>
                  </span>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg">
                    <Check className="h-3 w-3" />
                    <span>تم الاختيار</span>
                  </div>
                )}

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
                  <h3
                    className={`font-bold text-sm line-clamp-1 transition-colors ${
                      isSelected ? "text-rose-300" : "text-white group-hover:text-rose-300"
                    }`}
                  >
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

                  <span
                    className={`flex items-center gap-1 text-[11px] font-bold transition-all ${
                      isSelected
                        ? "text-emerald-400"
                        : "text-rose-400 group-hover:translate-x-[-2px]"
                    }`}
                  >
                    <span>{isSelected ? "الباقات معروضة بالأسفل" : "عرض الباقات والدفع"}</span>
                    <ArrowLeft className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
