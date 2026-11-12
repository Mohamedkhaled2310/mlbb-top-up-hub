import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    setIsOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-500/50 bg-[#160d05]/95 px-4 py-2 text-xs font-semibold text-amber-200 shadow-xl backdrop-blur-md animate-bounce"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>انقطع الاتصال بالإنترنت — سيتم استئناف الشحن تلقائياً عند عودة الشبكة</span>
    </div>
  );
}

