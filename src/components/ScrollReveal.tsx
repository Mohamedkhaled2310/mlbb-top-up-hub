import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealVariant = "fade-up" | "fade-scale" | "fade-in";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  variant?: RevealVariant;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  variant = "fade-up",
  threshold = 0.08,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Start visible on server / initial paint so SSR & tests never get trapped at opacity-0;
  // arm scroll reveal only for below-the-fold sections when IntersectionObserver is supported.
  const [phase, setPhase] = useState<"visible" | "hidden">("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const rect = el.getBoundingClientRect();
    const inInitialView = rect.top <= window.innerHeight * 0.94;
    if (inInitialView) {
      setPhase("visible");
      return;
    }

    setPhase("hidden");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            setPhase("visible");
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: "0px 0px -24px 0px" },
    );

    observer.observe(el);

    const checkPosition = () => {
      const r = el.getBoundingClientRect();
      if (r.top <= window.innerHeight * 0.96) {
        setPhase("visible");
        observer.disconnect();
        window.removeEventListener("scroll", checkPosition);
      }
    };
    window.addEventListener("scroll", checkPosition, { passive: true });

    // Safety fallback so fast programmatic jumps / mobile edge cases never stall invisible
    const fallbackTimer = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.top <= window.innerHeight * 1.2) {
        setPhase("visible");
        observer.disconnect();
        window.removeEventListener("scroll", checkPosition);
      }
    }, 900);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("scroll", checkPosition);
      observer.disconnect();
    };
  }, [threshold]);

  const hiddenClass =
    variant === "fade-scale"
      ? "opacity-0 translate-y-4 scale-[0.98]"
      : variant === "fade-in"
        ? "opacity-0"
        : "opacity-0 translate-y-6";

  const visibleClass = "opacity-100 translate-y-0 scale-100";

  return (
    <div
      ref={ref}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity] ${
        phase === "visible" ? visibleClass : hiddenClass
      } ${className}`}
    >
      {children}
    </div>
  );
}
