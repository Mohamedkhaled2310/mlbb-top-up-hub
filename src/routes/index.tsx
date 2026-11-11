import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import CheckoutModal from "../components/CheckoutModal";
import { PlayerIdGuideModal } from "../components/PlayerIdGuideModal";
import { GamesSection } from "../components/GamesSection";
import { GamePackageIcon } from "../components/GamePackageIcon";
import { useStore } from "../lib/store/useStore";
import type { TopUpPackage, PackageCategory } from "../types/store";
import { getStoreApi } from "../lib/api-client";
import metoPoster from "../assets/meto-poster.jpg";
import metoLogo from "../assets/meto-logo.jpg";
import {
  Gem, Calendar, Sparkles, Package, Layers, HelpCircle, ShieldCheck, Clock, ChevronRight, Search, Image as ImageIcon, MessageCircle, LayoutGrid, List, ChevronDown, ChevronUp, X, ShoppingCart, Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { toast } from "../hooks/use-toast";

export const Route = createFileRoute("/")({ component: CustomerStorePage });

const GAME_CONFIG: Record<string, any> = {
  mlbb: { name: "Mobile Legends: Bang Bang", currency: "جوهرة", idLabel: "معرف اللاعب (User ID)", idPlaceholder: "مثال: 12345678", needsZone: true, zoneLabel: "رقم السيرفر (Zone ID)", zonePlaceholder: "مثال: 2024", guideTitle: "أين أجد الـ User ID والـ Zone ID؟" },
  pubg: { name: "PUBG Mobile", currency: "UC", idLabel: "معرف اللاعب (Character ID)", idPlaceholder: "مثال: 5123456789", needsZone: false, guideTitle: "كيف أجد Character ID؟" },
  freefire: { name: "Free Fire", currency: "جوهرة", idLabel: "معرف اللاعب (Player ID)", idPlaceholder: "مثال: 1234567890", needsZone: false, guideTitle: "كيف أجد Player ID؟" },
  hok: { name: "Honor of Kings", currency: "Tokens", idLabel: "معرف اللاعب (Player ID)", idPlaceholder: "مثال: 987654321", needsZone: false, guideTitle: "كيف أجد Player ID؟" },
};

function CustomerStorePage() {
  const { packages, setPackages, settings, setSettings, player, setPlayer, cart, addToCart, updateCartQty, removeFromCart, clearCart, isMerchant } = useStore();
  const [selectedGameId, setSelectedGameId] = useState("mlbb");
  const activeGame = GAME_CONFIG[selectedGameId] || GAME_CONFIG.mlbb;
  const [region, setRegion] = useState(player.region || "");
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAllInAllCategory, setShowAllInAllCategory] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [loadingPkgs, setLoadingPkgs] = useState(false);

  useEffect(() => { setPlayer({ ...player, region }); }, [region]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingPkgs(true);
      try {
        const data = await getStoreApi();
        if (mounted && data?.packages) setPackages(data.packages);
        if (mounted && data?.settings) setSettings(data.settings);
      } catch { /* ignore */ } finally { if (mounted) setLoadingPkgs(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const handleGameSelect = (gameId: string) => {
    setSelectedGameId(gameId);
    setSelectedCategory("all");
    setShowAllInAllCategory(false);
  };

  const categories = useMemo(() => {
    const base = [
      { id: "all", label: "الكل", icon: Layers },
      { id: "diamonds", label: "جواهر/عملات", icon: Gem },
      { id: "weekly_pass", label: "بطاقات/اشتراكات", icon: Calendar },
      { id: "double_diamonds", label: "مضاعفة x2", icon: Sparkles },
      { id: "bundles", label: "حزم", icon: Package },
    ];
    return base;
  }, [selectedGameId]);

  const gamePackages = useMemo(() => packages.filter((p) => p.active && (p.gameId === selectedGameId || (selectedGameId === "mlbb" && (!p.gameId || p.gameId === "mlbb")))), [packages, selectedGameId]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return gamePackages.filter((p) => {
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const matchQ = !q || p.name.toLowerCase().includes(q) || String(p.diamonds || "").includes(q);
      return matchCat && matchQ;
    });
  }, [gamePackages, selectedCategory, searchQuery]);

  const displayedPackages = useMemo(() => {
    if (selectedCategory === "all" && !searchQuery.trim() && !showAllInAllCategory) return filteredPackages.slice(0, 10);
    return filteredPackages;
  }, [filteredPackages, selectedCategory, searchQuery, showAllInAllCategory]);
  const hasHiddenPackages = selectedCategory === "all" && !searchQuery.trim() && filteredPackages.length > 10;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * (isMerchant ? i.package.merchantBasePriceEgp : i.package.retailPriceEgp), 0);

  const onAdd = (pkg: TopUpPackage) => {
    addToCart(pkg);
    toast({ title: "أُضيف للسلة", description: pkg.name });
    setTimeout(() => {
      document.getElementById("player-input-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#070914] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="relative overflow-hidden border-b border-rose-500/20">
        <div className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen scale-105 blur-[2px]" style={{ backgroundImage: `url(${metoPoster})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070914] via-[#070914]/90 to-[#070914]/70" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 text-center">
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-cyan-400 p-1 shadow-2xl"><img src={metoLogo} alt="METO STORE" className="h-full w-full rounded-xl object-cover bg-white" /></div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/40 px-4 py-1 text-xs text-rose-300"><Sparkles className="h-3.5 w-3.5"/> <span>شحن فوري وآمن • أسعار محدثة من Fazer</span></div>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-2"><span className="text-rose-500">METO</span> STORE</h1>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-300 mb-4">اختر اللعبة والباقة، أدخل بيانات اللاعب ومنطقته، وأضف للسلة لإتمام الطلب.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto text-[11px] text-slate-300">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1224]/80 p-2.5"><Clock className="h-3.5 w-3.5 text-rose-400"/> تنفيذ سريع</div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0c1224]/80 p-2.5"><ShieldCheck className="h-3.5 w-3.5 text-cyan-400"/> تحقق من الحساب والمنطقة</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
            <button onClick={() => setPosterOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 py-2 px-3 text-xs font-bold"><ImageIcon className="h-4 w-4"/> بوستر الأسعار</button>
            <a href="https://wa.me/201070459339" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 py-2 px-3 text-xs font-bold"><MessageCircle className="h-4 w-4"/> تواصل واتساب</a>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex-1 w-full space-y-6 pb-28">
        <GamesSection selectedGameId={selectedGameId} onSelectGame={handleGameSelect} />

        <section id="packages-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-extrabold text-sm border border-cyan-500/30">1</div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-white">اختر الباقات وأضف للسلة <span className="text-xs text-rose-400">({filteredPackages.length})</span></h2>
                <p className="text-[11px] text-slate-400">{loadingPkgs ? "جاري تحميل الباقات من Fazer..." : (settings.packages_synced_at ? `آخر مزامنة: ${new Date(settings.packages_synced_at).toLocaleString('ar-EG')}` : "الباقات يتم مزامنتها من Fazer تلقائيًا")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
                <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} placeholder="ابحث..." className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pr-8 pl-8 py-2 text-xs text-white focus:border-rose-400 outline-none"/>
                {searchQuery && <button onClick={()=>setSearchQuery("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-3.5 w-3.5"/></button>}
              </div>
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1">
                <button onClick={()=>setViewMode("grid")} className={`p-1.5 rounded-lg ${viewMode==='grid'?'bg-rose-500/25 text-rose-300':'text-slate-400'}`}><LayoutGrid className="h-4 w-4"/></button>
                <button onClick={()=>setViewMode("list")} className={`p-1.5 rounded-lg ${viewMode==='list'?'bg-rose-500/25 text-rose-300':'text-slate-400'}`}><List className="h-4 w-4"/></button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat:any)=>{
              const Icon = cat.icon; const active = selectedCategory===cat.id;
              return <button key={cat.id} onClick={()=>{setSelectedCategory(cat.id); setShowAllInAllCategory(false);}} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${active?'bg-rose-500/20 text-rose-300 border border-rose-500/50':'border border-slate-800 bg-slate-900/60 text-slate-400'}`}><Icon className="h-3.5 w-3.5"/>{cat.label}</button>;
            })}
          </div>

          {viewMode === "list" ? (
            <div className="space-y-2">
              {displayedPackages.map((p)=> (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/90 bg-[#0a0f1d]/90">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GamePackageIcon category={p.category} diamonds={p.diamonds} bonusDiamonds={p.bonusDiamonds} gameId={p.gameId||selectedGameId} currencyName={p.currencyName||activeGame.currency} size="sm" />
                    <div className="min-w-0"><div className="font-bold text-white text-xs sm:text-sm truncate">{p.name}</div><div className="text-[10px] text-slate-400">{p.bonusDiamonds?`${p.diamonds}+${p.bonusDiamonds}`:p.diamonds?`${p.diamonds} ${p.currencyName||activeGame.currency}`:"باقة"}</div></div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right"><div className="text-xs font-black text-white">{isMerchant?p.merchantBasePriceEgp:p.retailPriceEgp} ج.م</div></div>
                    <Button size="sm" onClick={()=>onAdd(p)} className="h-8"><Plus className="w-4 h-4"/></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {displayedPackages.map((p)=> (
                <div key={p.id} className="group relative flex flex-col justify-between rounded-xl border p-3 border-slate-800/90 bg-[#0a0f1d]/90">
                  <div className="pt-1">
                    <div className="mb-1.5"><GamePackageIcon category={p.category} diamonds={p.diamonds} bonusDiamonds={p.bonusDiamonds} gameId={p.gameId||selectedGameId} currencyName={p.currencyName||activeGame.currency} size="sm" /></div>
                    <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-2">{p.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.bonusDiamonds?`${p.diamonds}+${p.bonusDiamonds} إضافي`: (p.diamonds?`${p.diamonds} ${p.currencyName||activeGame.currency}`:"")}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="text-xs font-black text-white">{isMerchant?p.merchantBasePriceEgp:p.retailPriceEgp} <span className="text-[9px] text-slate-400 font-normal">ج.م</span></div>
                    <Button size="sm" onClick={()=>onAdd(p)} className="h-7 px-2"><Plus className="w-4 h-4"/></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {displayedPackages.length===0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">لا توجد باقات متاحة لهذه اللعبة الآن. {settings.packages_synced_at?"":"(لم تتم المزامنة بعد من Fazer)"}</div>
          )}
          {hasHiddenPackages && (
            <div className="flex justify-center pt-1">
              {!showAllInAllCategory ? (
                <button onClick={()=>setShowAllInAllCategory(true)} className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-xs font-bold">عرض الكل ({filteredPackages.length-10}+)<ChevronDown className="h-4 w-4"/></button>
              ) : (
                <button onClick={()=>{setShowAllInAllCategory(false); document.getElementById('packages-section')?.scrollIntoView({behavior:'smooth'});}} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs">عرض أقل <ChevronUp className="h-4 w-4"/></button>
              )}
            </div>
          )}
        </section>
        <section id="player-input-card" className="rounded-2xl border border-rose-500/25 bg-[#0a0f20]/90 p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-extrabold text-sm border border-rose-500/30">2</div>
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-white">بيانات اللاعب لـ {activeGame.name}</h2>
                <p className="text-[11px] text-slate-400">اختر الباقة أولاً ثم أدخل المعرف والمنطقة هنا لإتمام الطلب.</p>
              </div>
            </div>
            <button onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-cyan-400"><HelpCircle className="h-4 w-4"/> {activeGame.guideTitle}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className={`${activeGame.needsZone ? "sm:col-span-5" : "sm:col-span-6"} space-y-1.5`}>
              <label className="text-xs font-semibold text-slate-300">{activeGame.idLabel} *</label>
              <input value={player.id} onChange={(e) => setPlayer({ ...player, id: e.target.value })} placeholder={activeGame.idPlaceholder} className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400 outline-none font-mono" />
            </div>
            {activeGame.needsZone && (
              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{activeGame.zoneLabel}</label>
                <input value={player.zoneId || ""} onChange={(e) => setPlayer({ ...player, zoneId: e.target.value })} placeholder={activeGame.zonePlaceholder} className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400 outline-none font-mono" />
              </div>
            )}
            <div className={`${activeGame.needsZone ? "sm:col-span-4" : "sm:col-span-6"} space-y-1.5`}>
              <label className="text-xs font-semibold text-slate-300">منطقة الحساب (Region) *</label>
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="مثال: EG / MENA / Global" className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400 outline-none" />
              <p className="text-[11px] text-slate-400">لازم تطابق منطقة الحساب الحقيقية، وإلا الطلب هيفشل.</p>
            </div>
          </div>
        </section>

      </main>

      {cart.length>0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-rose-500/40 bg-[#0d1022]/95 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3 min-w-0"><div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-rose-300"/></div><div className="min-w-0"><div className="font-bold text-sm">{cartCount} عنصر في السلة</div><div className="text-xs text-slate-300">الإجمالي: <span className="text-rose-300 font-bold">{cartTotal} ج.م</span></div></div></div>
            <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={clearCart}>تفريغ</Button><Button onClick={()=>setCheckoutOpen(true)}>إتمام الطلب</Button></div>
          </div>
        </div>
      )}

      <Footer className="mt-10" />

      <CheckoutModal open={checkoutOpen} onClose={()=>setCheckoutOpen(false)} cart={cart} onUpdateQty={updateCartQty} onRemove={removeFromCart} onClear={clearCart} />
      <PlayerIdGuideModal open={guideOpen} onOpenChange={setGuideOpen} gameId={selectedGameId} />

      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0e1c] border border-cyan-500/40 text-slate-100 p-4 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="mb-2"><DialogTitle className="text-base font-bold text-white flex items-center gap-2"><ImageIcon className="h-4 w-4 text-cyan-400"/> بوستر الأسعار</DialogTitle></DialogHeader>
          <div className="rounded-xl overflow-hidden border border-slate-800"><img src={metoPoster} alt="Poster" className="w-full h-auto object-contain"/></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
