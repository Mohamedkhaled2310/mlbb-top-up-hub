import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Gem,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import CheckoutModal from "../components/CheckoutModal";
import { PlayerIdGuideModal } from "../components/PlayerIdGuideModal";
import { GamesSection } from "../components/GamesSection";
import { GamePackageIcon } from "../components/GamePackageIcon";
import { ScrollReveal } from "../components/ScrollReveal";
import { OfflineIndicator } from "../components/OfflineIndicator";
import { PackageCardSkeleton } from "../components/PackageCardSkeleton";
import { getRecentAccounts, saveRecentAccount, type SavedPlayerAccount } from "../lib/recent-players";
import { useStore } from "../lib/store/useStore";
import { calcMerchantUnitPriceEgp } from "../lib/pricing";
import type { PackageCategory, TopUpPackage } from "../types/store";
import { getStoreApi, validatePlayerApi } from "../lib/api-client";
import metoPoster from "../assets/meto-poster.webp";
import metoLogo from "../assets/meto-logo.webp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { toast } from "../hooks/use-toast";

export const Route = createFileRoute("/")({ component: CustomerStorePage });

type GameMeta = {
  name: string;
  currency: string;
  idLabel: string;
  idPlaceholder: string;
  needsZone: boolean;
  zoneLabel?: string;
  zonePlaceholder?: string;
  guideTitle: string;
};

const GAME_CONFIG: Record<string, GameMeta> = {
  mlbb: {
    name: "Mobile Legends: Bang Bang",
    currency: "جوهرة",
    idLabel: "معرف اللاعب (User ID)",
    idPlaceholder: "مثال: 12345678",
    needsZone: true,
    zoneLabel: "رقم السيرفر (Zone ID)",
    zonePlaceholder: "مثال: 2024",
    guideTitle: "أين أجد الـ User ID والـ Zone ID؟",
  },
  pubg: {
    name: "PUBG Mobile",
    currency: "UC",
    idLabel: "معرف اللاعب (Character ID)",
    idPlaceholder: "مثال: 5123456789",
    needsZone: false,
    guideTitle: "كيف أجد Character ID؟",
  },
  freefire: {
    name: "Free Fire",
    currency: "جوهرة",
    idLabel: "معرف اللاعب (Player ID)",
    idPlaceholder: "مثال: 1234567890",
    needsZone: false,
    guideTitle: "كيف أجد Player ID؟",
  },
  hok: {
    name: "Honor of Kings",
    currency: "Tokens",
    idLabel: "معرف اللاعب (Player ID)",
    idPlaceholder: "مثال: 987654321",
    needsZone: false,
    guideTitle: "كيف أجد Player ID؟",
  },
};

function CustomerStorePage() {
  const {
    packages,
    setPackages,
    settings,
    setSettings,
    player,
    setPlayer,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    isMerchant,
    merchant,
  } = useStore();

  const [selectedGameId, setSelectedGameId] = useState("mlbb");
  const activeGame = (GAME_CONFIG[selectedGameId] || GAME_CONFIG["mlbb"])!;
  const [selectedPkgRegion, setSelectedPkgRegion] = useState("global");
  const [region, setRegion] = useState(player.region || "");
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAllInAllCategory, setShowAllInAllCategory] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [detectingRegion, setDetectingRegion] = useState(false);
  const [detectedPlayer, setDetectedPlayer] = useState<string | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [regionLocked, setRegionLocked] = useState(false);
  const [needsManualRegion, setNeedsManualRegion] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<SavedPlayerAccount[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setShowScrollTop(y > 380);
      setScrollProgress(docHeight > 0 ? Math.min(100, Math.round((y / docHeight) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadStore = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingPkgs(true);
      try {
        const data = await getStoreApi();
        if (data?.packages) setPackages(data.packages);
        if (data?.settings) setSettings(data.settings);
      } catch {
        // Ignore transient network hiccups during background refresh
      } finally {
        if (!silent) setLoadingPkgs(false);
      }
    },
    [setPackages, setSettings],
  );

  // Initial load + automatic periodic & focus refresh
  useEffect(() => {
    loadStore(false);
    const interval = setInterval(() => loadStore(true), 30000);
    const onFocus = () => loadStore(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadStore(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadStore]);

  useEffect(() => {
    setRegionLocked(false);
    setDetectedPlayer(null);
    setRegionError(null);
    setRegion("");
    setNeedsManualRegion(false);
    setRecentAccounts(getRecentAccounts(selectedGameId));
  }, [player.id, player.zoneId, selectedGameId]);

  const detectRegion = useCallback(
    async (silent = false) => {
      if (!player.id) {
        if (!silent) toast({ title: "أدخل معرف اللاعب أولاً" });
        return;
      }
      if (activeGame.needsZone && !player.zoneId) {
        if (!silent) toast({ title: "أدخل رقم السيرفر أولاً" });
        return;
      }
      setDetectingRegion(true);
      if (!silent) {
        setRegionError(null);
        setDetectedPlayer(null);
      }
      try {
        const categoryId = cart[0]?.package.fazerCategoryId;
        const res = await validatePlayerApi(
          player.id,
          player.zoneId,
          selectedGameId,
          region || undefined,
          categoryId,
        );
        if (res.valid) {
          const accRegion = res.accountRegion || "";
          if (accRegion) {
            setRegion(accRegion);
            setSelectedPkgRegion(accRegion);
            setRegionLocked(true);
            setNeedsManualRegion(false);
            setRegionError(null);
          } else {
            setRegionLocked(false);
            setNeedsManualRegion(true);
          }
          if (res.username) setDetectedPlayer(res.username);
          setPlayer({ ...player, name: res.username || player.name, region: accRegion || region || player.region });
          saveRecentAccount({
            id: player.id,
            zoneId: player.zoneId,
            name: res.username || undefined,
            region: accRegion || region || undefined,
            gameId: selectedGameId,
          });
          setRecentAccounts(getRecentAccounts(selectedGameId));
          if (!silent) {
            toast({
              title: "تم التحقق من الحساب",
              description: `${res.username || "اللاعب"}${accRegion ? ` • المنطقة: ${accRegion}` : ""}`,
            });
          }
        } else {
          setRegionLocked(false);
          if (res.error && (res.error.includes("منطقة") || res.error.includes("region") || res.error.includes("Region"))) {
            setNeedsManualRegion(true);
          }
          if (!silent) {
            setRegionError(res.error || "تعذر التحقق من الحساب");
            toast({ title: "تعذر التحقق", description: res.error || "تحقق من المعرف والمنطقة" });
          }
        }
      } catch {
        setRegionLocked(false);
        if (!silent) {
          setRegionError("تعذر الاتصال بالخادم");
          toast({ title: "خطأ", description: "تعذر الاتصال بالخادم" });
        }
      } finally {
        setDetectingRegion(false);
      }
    },
    [player, activeGame.needsZone, selectedGameId, region, cart, setPlayer],
  );

  useEffect(() => {
    if (!player.id) return;
    if (activeGame.needsZone && !player.zoneId) return;
    const t = setTimeout(() => {
      detectRegion(true);
    }, 650);
    return () => clearTimeout(t);
  }, [player.id, player.zoneId, selectedGameId, activeGame.needsZone]);

  const handleGameSelect = (gameId: string) => {
    setSelectedGameId(gameId);
    setSelectedCategory("all");
    setSelectedPkgRegion(gameId === "freefire" ? "mena" : "global");
    setShowAllInAllCategory(false);
  };

  const categories = useMemo(
    () => [
      { id: "all", label: "الكل", icon: Layers },
      { id: "diamonds", label: selectedGameId === "pubg" ? "شدات UC" : selectedGameId === "hok" ? "توكنز" : "جواهر/عملات", icon: Gem },
      { id: "weekly_pass", label: "بطاقات/اشتراكات", icon: Calendar },
      { id: "double_diamonds", label: "مضاعفة x2", icon: Sparkles },
      { id: "bundles", label: "حزم", icon: Package },
    ],
    [selectedGameId],
  );

  const packageCounts = useMemo(() => {
    const counts: Record<string, number> = { mlbb: 0, pubg: 0, freefire: 0, hok: 0 };
    for (const p of packages) {
      if (!p.active) continue;
      const g = p.gameId || "mlbb";
      counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [packages]);

  const gamePackages = useMemo(
    () =>
      packages.filter(
        (p) => p.active && (p.gameId === selectedGameId || (selectedGameId === "mlbb" && (!p.gameId || p.gameId === "mlbb"))),
      ),
    [packages, selectedGameId],
  );

  const availableRegions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of gamePackages) {
      const r = (Array.isArray(p.regions) && p.regions[0]) || (selectedGameId === "freefire" ? "mena" : "global");
      counts.set(r, (counts.get(r) || 0) + 1);
    }
    const order = ["global", "mena", "eu", "my", "id", "br", "tr", "ph", "sg", "ru", "us", "bd", "cis", "latam", "th", "tw", "vn"];
    return Array.from(counts.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [gamePackages, selectedGameId]);

  const effectivePkgRegion = useMemo(() => {
    if (!availableRegions.length) return "all";
    if (availableRegions.some(([r]) => r === selectedPkgRegion)) return selectedPkgRegion;
    return availableRegions[0]![0];
  }, [availableRegions, selectedPkgRegion]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return gamePackages.filter((p) => {
      const r = (Array.isArray(p.regions) && p.regions[0]) || (selectedGameId === "freefire" ? "mena" : "global");
      const matchReg = effectivePkgRegion === "all" || availableRegions.length <= 1 || r === effectivePkgRegion;
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const matchQ = !q || p.name.toLowerCase().includes(q) || String(p.diamonds || "").includes(q);
      return matchReg && matchCat && matchQ;
    });
  }, [gamePackages, selectedGameId, effectivePkgRegion, availableRegions.length, selectedCategory, searchQuery]);

  const displayedPackages = useMemo(() => {
    if (selectedCategory === "all" && !searchQuery.trim() && !showAllInAllCategory) {
      return filteredPackages.slice(0, 12);
    }
    return filteredPackages;
  }, [filteredPackages, selectedCategory, searchQuery, showAllInAllCategory]);

  const hasHiddenPackages = selectedCategory === "all" && !searchQuery.trim() && filteredPackages.length > 12;

  const merchantMargin = Number(merchant?.margin_percent || 0);
  const getDisplayPrice = (pkg: TopUpPackage): number => {
    if (isMerchant) {
      const base = pkg.merchantBasePriceEgp ?? pkg.retailPriceEgp;
      return calcMerchantUnitPriceEgp(base, merchantMargin, pkg.costUsd, settings.egp_rate);
    }
    return pkg.retailPriceEgp;
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * getDisplayPrice(i.package), 0);

  const onAdd = (pkg: TopUpPackage) => {
    addToCart(pkg);
    toast({ title: "أُضيف للسلة", description: pkg.name });
  };

  return (
    <div className="min-h-screen min-h-dvh bg-[#070914] text-slate-100 flex flex-col font-sans flex-1">
      <OfflineIndicator />
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 z-50 h-0.5 bg-transparent pointer-events-none"
      >
        <div
          className="h-full bg-gradient-to-l from-rose-500 via-fuchsia-500 to-cyan-400 transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <Navbar />

      <div className="relative overflow-hidden border-b border-rose-500/20">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen scale-105 blur-[2px]"
          style={{ backgroundImage: `url(${metoPoster})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070914] via-[#070914]/90 to-[#070914]/70" />
        <div className="relative mx-auto max-w-7xl px-3 sm:px-6 py-8 sm:py-12 text-center animate-meto-enter">
          <div className="flex flex-col items-center mb-3 sm:mb-4">
            <div className="animate-meto-float relative mb-3 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-400 p-1 shadow-2xl shadow-rose-500/25">
              <img src={metoLogo} alt="METO STORE" className="h-full w-full rounded-xl object-cover bg-white" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/40 px-3.5 py-1 text-[11px] sm:text-xs text-rose-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>شحن فوري وآمن • أسعار محدّثة تلقائياً</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">
            <span className="text-rose-500">METO</span> STORE
          </h1>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-300 mb-4">
            اختر لعبتك المفضلة والباقة المناسبة، أدخل بيانات حسابك، واستلم شحنك خلال ثوانٍ.
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-[11px] text-slate-300">
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-[#0c1224]/85 p-2.5">
              <Clock className="h-3.5 w-3.5 text-rose-400" /> تنفيذ آلي سريع
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-[#0c1224]/85 p-2.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> تحقق ذكي من الحساب
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            <button
              onClick={() => setPosterOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 hover:-translate-y-0.5 text-cyan-300 py-2 px-4 text-xs font-bold transition-all"
            >
              <ImageIcon className="h-4 w-4" /> بوستر الأسعار
            </button>
            <a
              href="https://wa.me/201070459339"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 hover:-translate-y-0.5 text-emerald-300 py-2 px-4 text-xs font-bold transition-all"
            >
              <MessageCircle className="h-4 w-4" /> تواصل واتساب
            </a>
          </div>
          <button
            type="button"
            aria-label="التمرير للأسفل نحو الألعاب"
            onClick={() => document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-5 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-300 transition-colors"
          >
            <span>تصفح الباقات</span>
            <ChevronDown className="h-3.5 w-3.5 animate-meto-scroll-cue" />
          </button>
        </div>
      </div>

      <main className={`mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full space-y-6 py-6 ${cart.length > 0 ? "pb-24 sm:pb-28" : "pb-8 sm:pb-12"}`}>
        <ScrollReveal>
          <GamesSection selectedGameId={selectedGameId} onSelectGame={handleGameSelect} packageCounts={packageCounts} />
        </ScrollReveal>

        <ScrollReveal delayMs={80}>
          <section id="packages-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-extrabold text-sm border border-cyan-500/30">
                1
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-white">
                  باقات {activeGame.name} <span className="text-xs text-rose-400 font-mono">({filteredPackages.length})</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  {loadingPkgs
                    ? "جاري تحديث الباقات من Fazer..."
                    : settings.packages_synced_at
                      ? `آخر مزامنة: ${new Date(settings.packages_synced_at).toLocaleString("ar-EG")}`
                      : "يتم التحديث تلقائياً من Fazer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن باقة..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pr-8 pl-8 py-2 text-xs text-white focus:border-rose-400 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="مسح البحث"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="عرض شبكة"
                  className={`p-1.5 rounded-lg ${viewMode === "grid" ? "bg-rose-500/25 text-rose-300" : "text-slate-400"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="عرض قائمة"
                  className={`p-1.5 rounded-lg ${viewMode === "list" ? "bg-rose-500/25 text-rose-300" : "text-slate-400"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setShowAllInAllCategory(false);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/50"
                      : "border border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {availableRegions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] text-slate-500 shrink-0 pl-1">السيرفر / المنطقة:</span>
              {availableRegions.map(([reg, cnt]) => {
                const active = effectivePkgRegion === reg;
                return (
                  <button
                    key={reg}
                    onClick={() => {
                      setSelectedPkgRegion(reg);
                      setShowAllInAllCategory(false);
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition-all ${
                      active
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                        : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{reg}</span>
                    <span className="text-[10px] opacity-75 font-mono">({cnt})</span>
                  </button>
                );
              })}
            </div>
          )}

          {loadingPkgs && displayedPackages.length === 0 ? (
            <PackageCardSkeleton count={8} viewMode={viewMode} />
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {displayedPackages.map((p, idx) => (
                <div
                  key={p.id}
                  style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                  className="animate-meto-card flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-800/90 bg-[#0a0f1d]/90 hover:border-rose-500/35 hover:-translate-y-0.5 hover:shadow-md hover:shadow-rose-500/10 active:scale-[0.99] transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GamePackageIcon
                      category={p.category}
                      diamonds={p.diamonds}
                      bonusDiamonds={p.bonusDiamonds ?? 0}
                      gameId={p.gameId || selectedGameId}
                      currencyName={p.currencyName || activeGame.currency}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm truncate">{p.name}</span>
                        {p.category === "weekly_pass" && (
                          <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold shrink-0">
                            بطاقة
                          </span>
                        )}
                        {p.category === "double_diamonds" && (
                          <span className="rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 text-[10px] font-bold shrink-0">
                            2x
                          </span>
                        )}
                        {Boolean(p.raw?.["is_composite"]) && (
                          <span className="rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 text-[10px] font-bold shrink-0">
                            مجمعة
                          </span>
                        )}
                        <span className="rounded bg-slate-800/80 text-cyan-300 border border-slate-700/60 px-1.5 py-0.2 text-[10px] font-mono uppercase font-bold shrink-0">
                          {(Array.isArray(p.regions) && p.regions[0]) || (p.gameId === "freefire" ? "mena" : "global")}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.bonusDiamonds
                          ? `${p.diamonds} + ${p.bonusDiamonds} إضافي`
                          : p.diamonds
                            ? `${p.diamonds} ${p.currencyName || activeGame.currency}`
                            : "باقة شحن"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm font-black text-white font-mono">{getDisplayPrice(p)} ج.م</div>
                    </div>
                    <Button size="sm" onClick={() => onAdd(p)} className="h-8 px-2.5 bg-rose-600 hover:bg-rose-500 text-white active:scale-95">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {displayedPackages.map((p, idx) => (
                <div
                  key={p.id}
                  style={{ animationDelay: `${Math.min(idx, 11) * 30}ms` }}
                  className="animate-meto-card group relative flex flex-col justify-between rounded-xl border p-3 border-slate-800/90 bg-[#0a0f1d]/90 hover:border-rose-500/45 hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-500/10 active:scale-[0.985] transition-all duration-200"
                >
                  <div className="pt-0.5">
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <GamePackageIcon
                        category={p.category}
                        diamonds={p.diamonds}
                        bonusDiamonds={p.bonusDiamonds ?? 0}
                        gameId={p.gameId || selectedGameId}
                        currencyName={p.currencyName || activeGame.currency}
                        size="sm"
                      />
                      {p.category === "weekly_pass" && (
                        <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                          بطاقة
                        </span>
                      )}
                      {p.category === "double_diamonds" && (
                        <span className="rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                          2x
                        </span>
                      )}
                      {Boolean(p.raw?.["is_composite"]) && (
                        <span className="rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                          مجمعة
                        </span>
                      )}
                      <span className="rounded bg-slate-800 text-cyan-300 border border-slate-700/60 px-1.5 py-0.5 text-[10px] font-mono uppercase font-bold">
                        {(Array.isArray(p.regions) && p.regions[0]) || (p.gameId === "freefire" ? "mena" : "global")}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-2 min-h-[2.25rem]">{p.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {p.bonusDiamonds
                        ? `${p.diamonds} + ${p.bonusDiamonds} إضافي`
                        : p.diamonds
                          ? `${p.diamonds} ${p.currencyName || activeGame.currency}`
                          : "باقة رسمية"}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="text-xs sm:text-sm font-black text-white font-mono">
                      {getDisplayPrice(p)} <span className="text-[10px] text-slate-400 font-sans font-normal">ج.م</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAdd(p)}
                      aria-label={`إضافة ${p.name}`}
                      className="h-8 px-2.5 bg-rose-600 hover:bg-rose-500 text-white active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {displayedPackages.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs sm:text-sm text-slate-400 space-y-2">
              <p>لا توجد باقات متاحة حالياً للعبة {activeGame.name}.</p>
              <p className="text-[11px] text-slate-500">
                {settings.packages_synced_at
                  ? "قد تكون الباقات تحت التحديث من Fazer — جرّب اختيار لعبة أخرى أو أعد المحاولة بعد لحظات."
                  : "افتح لوحة الأدمن واضغط مزامنة Fazer لجلب جميع الباقات وتفعيلها."}
              </p>
            </div>
          )}

          {hasHiddenPackages && (
            <div className="flex justify-center pt-1">
              {!showAllInAllCategory ? (
                <button
                  onClick={() => setShowAllInAllCategory(true)}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 hover:bg-rose-950/50 px-4 py-2 text-xs font-bold text-rose-200 transition-colors"
                >
                  عرض الكل ({filteredPackages.length - 12}+) <ChevronDown className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowAllInAllCategory(false);
                    document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-300"
                >
                  عرض أقل <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </section>
        </ScrollReveal>

        <ScrollReveal delayMs={80} variant="fade-scale">
          <section id="player-input-card" className="rounded-2xl border border-rose-500/25 bg-[#0a0f20]/90 p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-extrabold text-sm border border-rose-500/30 shrink-0">
                2
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-white">بيانات اللاعب لـ {activeGame.name}</h2>
                <p className="text-[11px] text-slate-400">أدخل معرف الحساب للتحقق الفوري وإتمام الشحن.</p>
              </div>
            </div>
            <button onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 self-start sm:self-auto">
              <HelpCircle className="h-4 w-4" /> {activeGame.guideTitle}
            </button>
          </div>

          {recentAccounts.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> حسابات سابقة:
              </span>
              {recentAccounts.slice(0, 4).map((acc) => (
                <button
                  key={`${acc.id}-${acc.zoneId || ""}`}
                  type="button"
                  onClick={() => {
                    const next = { ...player, id: acc.id, zoneId: acc.zoneId || "" };
                    if (acc.name) next.name = acc.name;
                    if (acc.region) next.region = acc.region;
                    setPlayer(next);
                    if (acc.name) setDetectedPlayer(acc.name);
                    if (acc.region) {
                      setRegion(acc.region);
                      setSelectedPkgRegion(acc.region);
                      setRegionLocked(true);
                      setNeedsManualRegion(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:border-cyan-500/50 px-2.5 py-1 text-[11px] text-slate-300 transition-all font-mono active:scale-95 shadow-sm"
                  title="تعبئة بيانات الحساب تلقائياً"
                >
                  {acc.name ? <span className="font-sans font-bold text-white">{acc.name}</span> : null}
                  <span className="text-cyan-300">({acc.id}{acc.zoneId ? `:${acc.zoneId}` : ""})</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className={`${activeGame.needsZone ? "sm:col-span-7" : "sm:col-span-12"} space-y-1.5`}>
              <label className="text-xs font-semibold text-slate-300">{activeGame.idLabel} *</label>
              <input
                value={player.id}
                onChange={(e) => setPlayer({ ...player, id: e.target.value })}
                placeholder={activeGame.idPlaceholder}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400 outline-none font-mono"
              />
            </div>
            {activeGame.needsZone && (
              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{activeGame.zoneLabel}</label>
                <input
                  value={player.zoneId || ""}
                  onChange={(e) => setPlayer({ ...player, zoneId: e.target.value })}
                  placeholder={activeGame.zonePlaceholder}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400 outline-none font-mono"
                />
              </div>
            )}
          </div>

          {/* Automatic verification feedback & conditional Region input */}
          <div className="space-y-2.5">
            {detectingRegion && (
              <div className="flex items-center gap-2 text-xs text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>جاري التحقق التلقائي من بيانات الحساب...</span>
              </div>
            )}

            {detectedPlayer && (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 px-4 py-2.5 text-xs sm:text-sm text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    تم التحقق من الحساب: <b className="text-white">{detectedPlayer}</b>
                  </span>
                </div>
                {region && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-900/50 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{region}</span>
                  </span>
                )}
              </div>
            )}

            {needsManualRegion && !regionLocked && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2">
                <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>منطقة الحساب (Region) — لم تَرِد في معلومات الحساب، يرجى تحديدها:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={region}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegion(val);
                      setPlayer({ ...player, region: val });
                      setRegionError(null);
                    }}
                    placeholder="أدخل المنطقة (مثال: Global أو MENA أو ID أو TR)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => detectRegion(false)}
                    disabled={detectingRegion || !player.id || (activeGame.needsZone && !player.zoneId)}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-600/50 bg-cyan-700/80 hover:bg-cyan-600 disabled:opacity-50 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors"
                  >
                    {detectingRegion ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    <span>تأكيد</span>
                  </button>
                </div>
              </div>
            )}

            {regionError && <p className="text-xs text-rose-400">{regionError}</p>}
          </div>
        </section>
        </ScrollReveal>
      </main>

      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="العودة إلى الأعلى"
          className={`fixed left-4 z-40 h-10 w-10 rounded-full border border-slate-700/80 bg-[#0d1226]/90 backdrop-blur-md text-slate-200 hover:border-rose-500/60 hover:text-rose-300 hover:-translate-y-0.5 shadow-xl flex items-center justify-center transition-all duration-300 ${
            cart.length > 0 ? "bottom-20 sm:bottom-24" : "bottom-5"
          }`}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-6 z-40 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-rose-500/40 bg-[#0d1022]/95 backdrop-blur-xl p-3 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm truncate">{cartCount} عنصر في السلة</div>
                <div className="text-[11px] sm:text-xs text-slate-300">
                  الإجمالي: <span className="text-rose-300 font-bold font-mono">{cartTotal} ج.م</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white text-xs"
                onClick={clearCart}
              >
                تفريغ
              </Button>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm px-3 sm:px-4" onClick={() => setCheckoutOpen(true)}>
                إتمام الطلب
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer className={cart.length > 0 ? "pb-20 md:pb-0" : ""} />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        onUpdateQty={updateCartQty}
        onRemove={removeFromCart}
        onClear={clearCart}
        onOrderSuccess={() => loadStore(true)}
      />
      <PlayerIdGuideModal open={guideOpen} onOpenChange={setGuideOpen} gameId={selectedGameId} />

      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0e1c] border border-cyan-500/40 text-slate-100 p-4 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" /> بوستر الأسعار
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl overflow-hidden border border-slate-800">
            <img src={metoPoster} alt="Poster" className="w-full h-auto object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
