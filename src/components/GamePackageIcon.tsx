import React from "react";
import { PackageCategory } from "../types/store";

interface GamePackageIconProps {
  category: PackageCategory;
  diamonds: number;
  bonusDiamonds?: number | undefined;
  gameId?: string | undefined;
  currencyName?: string | undefined;
  className?: string | undefined;
  size?: "sm" | "md" | "lg";
}

/**
 * Professional 3D game asset icons for top-up packages:
 * - PUBG Mobile: 3D Golden UC Coins, Royale Pass Badge & Airdrop Crates
 * - Free Fire: 3D Ruby/Diamond Crystals & Membership Cards
 * - Honor of Kings: 3D Golden Flame Tokens
 * - Mobile Legends: 3D Blue Faceted Diamonds, Weekly Diamond Pass & Overflowing Chests
 */
export function GamePackageIcon({
  category,
  diamonds,
  bonusDiamonds,
  gameId = "mlbb",
  currencyName,
  className = "",
  size = "md",
}: GamePackageIconProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-16 h-16",
  }[size];

  // ==========================================
  // PUBG MOBILE ICONS (Unknown Cash - UC)
  // ==========================================
  if (gameId === "pubg" || currencyName === "UC" || currencyName?.includes("UC")) {
    // Royale Pass or Pass category
    if (category === "weekly_pass" || category === "bundles" || diamonds >= 6000) {
      return (
        <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
          <div className="absolute inset-0 rounded-xl bg-amber-500/25 blur-md animate-pulse" />
          <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_10px_rgba(245,158,11,0.5)]" fill="none">
            <defs>
              <linearGradient id="pubgGold" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="crateRed" x1="4" y1="12" x2="44" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>
            {/* Military Airdrop Crate with Gold Top */}
            <rect x="8" y="16" width="32" height="26" rx="4" fill="url(#crateRed)" stroke="#fca5a5" strokeWidth="1.2" />
            <rect x="6" y="12" width="36" height="8" rx="2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
            <line x1="24" y1="12" x2="24" y2="42" stroke="#fef08a" strokeWidth="2.5" />
            {/* Center Golden Shield Badge */}
            <circle cx="24" cy="28" r="8" fill="url(#pubgGold)" stroke="#fef08a" strokeWidth="1" />
            <text x="24" y="31.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#451a03">UC</text>
            {/* Stars */}
            <polygon points="24,4 26,9 31,9 27,12 29,17 24,14 19,17 21,12 17,9 22,9" fill="url(#pubgGold)" />
          </svg>
        </div>
      );
    }

    // Stacked Golden UC Coins
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-amber-400/20 blur-md" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(245,158,11,0.4)]" fill="none">
          <defs>
            <linearGradient id="coinGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* Back Coin */}
          <ellipse cx="20" cy="28" rx="13" ry="8" fill="#92400e" />
          <ellipse cx="20" cy="25" rx="13" ry="8" fill="url(#coinGrad)" stroke="#fef08a" strokeWidth="1" />
          {/* Middle Coin */}
          <ellipse cx="28" cy="24" rx="13" ry="8" fill="#92400e" />
          <ellipse cx="28" cy="21" rx="13" ry="8" fill="url(#coinGrad)" stroke="#fef08a" strokeWidth="1" />
          {/* Front Main Coin */}
          <ellipse cx="24" cy="18" rx="14" ry="9" fill="#92400e" />
          <ellipse cx="24" cy="15" rx="14" ry="9" fill="url(#coinGrad)" stroke="#fef08a" strokeWidth="1.2" />
          <text x="24" y="18" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#451a03">UC</text>
          {/* Sparkle */}
          <path d="M37 8 L38 10 L40 11 L38 12 L37 14 L36 12 L34 11 L36 10 Z" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // FREE FIRE ICONS
  // ==========================================
  if (gameId === "freefire") {
    if (category === "weekly_pass") {
      return (
        <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
          <div className="absolute inset-0 rounded-xl bg-rose-500/25 blur-md animate-pulse" />
          <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(244,63,94,0.4)]" fill="none">
            <defs>
              <linearGradient id="ffCard" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#9f1239" />
              </linearGradient>
            </defs>
            <rect x="5" y="9" width="38" height="30" rx="5" fill="url(#ffCard)" stroke="#fda4af" strokeWidth="1.5" />
            <polygon points="24,14 32,22 24,32 16,22" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
            <polygon points="24,14 24,32 32,22" fill="#0284c7" />
            <polygon points="24,14 16,22 24,22" fill="#bae6fd" />
            <text x="24" y="37" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#ffffff">VIP PASS</text>
          </svg>
        </div>
      );
    }

    // Free Fire Diamond / Ruby
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-rose-500/20 blur-md" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(244,63,94,0.4)]" fill="none">
          <defs>
            <linearGradient id="ffRuby" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fecdd3" />
              <stop offset="30%" stopColor="#f43f5e" />
              <stop offset="80%" stopColor="#be123c" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>
          <polygon points="24,6 38,19 24,42 10,19" fill="url(#ffRuby)" stroke="#fda4af" strokeWidth="1.2" />
          <polygon points="24,6 10,19 24,19" fill="#ffffff" opacity="0.75" />
          <polygon points="10,19 24,19 24,42" fill="#fb7185" opacity="0.6" />
          <polygon points="24,6 38,19 24,42" fill="#9f1239" opacity="0.45" />
          <polygon points="24,11 29,19 24,25 19,19" fill="#ffe4e6" opacity="0.85" />
          <path d="M34 9 L35 11 L37 12 L35 13 L34 15 L33 13 L31 12 L33 11 Z" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // HONOR OF KINGS ICONS
  // ==========================================
  if (gameId === "hok") {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-amber-500/20 blur-md" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(245,158,11,0.4)]" fill="none">
          <defs>
            <linearGradient id="hokGrad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          {/* Flame Token Outer Coin */}
          <circle cx="24" cy="24" r="17" fill="url(#hokGrad)" stroke="#fef08a" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="13" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.7" />
          {/* Flame Core */}
          <path d="M24 13 C26 17 29 19 29 23 C29 26 27 28 24 28 C21 28 19 26 19 23 C19 19 22 17 24 13 Z" fill="#ffffff" />
          <circle cx="24" cy="24" r="3.5" fill="#ea580c" />
          {/* Sparkle */}
          <path d="M36 8 L37 10 L39 11 L37 12 L36 14 L35 12 L33 11 L35 10 Z" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // ==========================================
  // MOBILE LEGENDS (MLBB) ICONS
  // ==========================================

  // 1. Weekly Diamond Pass
  if (category === "weekly_pass") {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-purple-500/20 blur-md animate-pulse" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(168,85,247,0.4)]" fill="none">
          <defs>
            <linearGradient id="wpCardGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="wpGemGrad" x1="16" y1="12" x2="32" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="wpGoldGrad" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>
          <rect x="4" y="8" width="40" height="32" rx="6" fill="url(#wpCardGrad)" stroke="#a855f7" strokeWidth="1.5" />
          <rect x="7" y="11" width="34" height="26" rx="4" stroke="#c084fc" strokeWidth="0.8" strokeDasharray="2 2" fill="none" opacity="0.6" />
          <circle cx="14" cy="8" r="1.5" fill="#f8fafc" />
          <circle cx="24" cy="8" r="1.5" fill="#f8fafc" />
          <circle cx="34" cy="8" r="1.5" fill="#f8fafc" />
          <polygon points="24,14 33,23 24,34 15,23" fill="url(#wpGemGrad)" />
          <polygon points="24,14 24,34 33,23" fill="#0891b2" opacity="0.6" />
          <polygon points="24,14 15,23 24,23" fill="#a5f3fc" opacity="0.8" />
          <path d="M35 12 L36 15 L39 16 L36 17 L35 20 L34 17 L31 16 L34 15 Z" fill="url(#wpGoldGrad)" />
          <rect x="18" y="32" width="12" height="5" rx="2" fill="#f59e0b" />
          <text x="24" y="36" textAnchor="middle" fontSize="3.8" fontWeight="bold" fill="#0f172a">PASS</text>
        </svg>
      </div>
    );
  }

  // 2. Double Diamonds (x2)
  if (category === "double_diamonds" || (bonusDiamonds && bonusDiamonds >= diamonds)) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-amber-500/20 blur-md animate-pulse" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(245,158,11,0.4)]" fill="none">
          <defs>
            <linearGradient id="ddGem1" x1="8" y1="10" x2="26" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="ddGem2" x1="22" y1="8" x2="40" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="goldBadge" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <polygon points="18,12 28,22 18,34 8,22" fill="url(#ddGem1)" opacity="0.85" />
          <polygon points="18,12 18,34 28,22" fill="#0369a1" opacity="0.6" />
          <polygon points="30,10 40,22 30,36 20,22" fill="url(#ddGem2)" stroke="#7dd3fc" strokeWidth="0.8" />
          <polygon points="30,10 30,36 40,22" fill="#0e7490" opacity="0.5" />
          <polygon points="30,10 20,22 30,22" fill="#bae6fd" opacity="0.9" />
          <circle cx="16" cy="33" r="8.5" fill="url(#goldBadge)" stroke="#fef08a" strokeWidth="1" />
          <text x="16" y="36.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#451a03">x2</text>
          <path d="M38 10 L39 12 L41 13 L39 14 L38 16 L37 14 L35 13 L37 12 Z" fill="#fde047" />
        </svg>
      </div>
    );
  }

  // 3. Bundles
  if (category === "bundles") {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-md" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(16,185,129,0.4)]" fill="none">
          <defs>
            <linearGradient id="bundleBox" x1="6" y1="12" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="bundleRibbon" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="8" y="18" width="32" height="24" rx="4" fill="url(#bundleBox)" stroke="#34d399" strokeWidth="1.2" />
          <rect x="6" y="14" width="36" height="8" rx="3" fill="#059669" stroke="#6ee7b7" strokeWidth="1.2" />
          <rect x="21" y="14" width="6" height="28" fill="url(#bundleRibbon)" />
          <ellipse cx="19" cy="12" rx="4" ry="2.5" fill="#fef08a" transform="rotate(-20 19 12)" />
          <ellipse cx="29" cy="12" rx="4" ry="2.5" fill="#fef08a" transform="rotate(20 29 12)" />
          <circle cx="24" cy="13" r="2.5" fill="#d97706" />
          <polygon points="24,3 28,8 24,13 20,8" fill="#38bdf8" />
        </svg>
      </div>
    );
  }

  // 4. Large Tier Diamonds: Over 2000 (Mega Chest)
  if (diamonds >= 2000) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-cyan-400/25 blur-md animate-pulse" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_10px_rgba(6,182,212,0.5)]" fill="none">
          <defs>
            <linearGradient id="chestBody" x1="6" y1="18" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="gemGlow" x1="10" y1="10" x2="38" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <path d="M8 24 L40 24 L37 42 L11 42 Z" fill="url(#chestBody)" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M6 18 L42 18 L39 10 L9 10 Z" fill="#b45309" stroke="#fbbf24" strokeWidth="1.2" />
          <polygon points="24,12 30,19 24,26 18,19" fill="url(#gemGlow)" />
          <polygon points="16,16 21,21 17,27 12,22" fill="#38bdf8" />
          <polygon points="32,16 37,22 32,27 27,21" fill="#67e8f9" />
          <polygon points="20,19 25,24 20,28 15,23" fill="#bae6fd" opacity="0.9" />
          <polygon points="28,19 33,23 28,28 23,24" fill="#a5f3fc" />
          <rect x="22" y="28" width="4" height="6" rx="1.5" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
          <line x1="24" y1="6" x2="24" y2="1" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="8" x2="10" y2="4" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="34" y1="8" x2="38" y2="4" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 5. Medium-Large Tier Diamonds: 400 - 1999 (Diamond Pouch / Sack)
  if (diamonds >= 400) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur-md" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(6,182,212,0.4)]" fill="none">
          <defs>
            <linearGradient id="sackGrad" x1="12" y1="16" x2="36" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="gemPouch" x1="14" y1="10" x2="34" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <path d="M14 20 C10 32 10 40 18 42 C24 43 24 43 30 42 C38 40 38 32 34 20 Z" fill="url(#sackGrad)" stroke="#38bdf8" strokeWidth="1.2" />
          <ellipse cx="24" cy="20" rx="9" ry="2.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" />
          <polygon points="24,8 30,15 24,22 18,15" fill="url(#gemPouch)" />
          <polygon points="24,8 24,22 30,15" fill="#0284c7" opacity="0.6" />
          <polygon points="24,8 18,15 24,15" fill="#bae6fd" opacity="0.85" />
          <polygon points="17,14 21,18 17,22 13,18" fill="#67e8f9" />
          <polygon points="31,14 35,18 31,22 27,18" fill="#38bdf8" />
          <path d="M33 7 L34 9 L36 10 L34 11 L33 13 L32 11 L30 10 L32 9 Z" fill="#fde047" />
        </svg>
      </div>
    );
  }

  // 6. Medium Tier Diamonds: 150 - 399 (Diamond Cluster)
  if (diamonds >= 150) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-md" />
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(6,182,212,0.4)]" fill="none">
          <defs>
            <linearGradient id="clusterMain" x1="16" y1="10" x2="32" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="clusterSide" x1="6" y1="16" x2="22" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
          <polygon points="14,18 22,26 14,36 6,26" fill="url(#clusterSide)" opacity="0.85" stroke="#38bdf8" strokeWidth="0.8" />
          <polygon points="34,18 42,26 34,36 26,26" fill="url(#clusterSide)" opacity="0.85" stroke="#38bdf8" strokeWidth="0.8" />
          <polygon points="24,10 33,21 24,34 15,21" fill="url(#clusterMain)" stroke="#bae6fd" strokeWidth="1.2" />
          <polygon points="24,10 24,34 33,21" fill="#0369a1" opacity="0.55" />
          <polygon points="24,10 15,21 24,21" fill="#cffafe" opacity="0.9" />
          <circle cx="21" cy="16" r="1.5" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // 7. Small Tier Diamonds: 1 - 149 (Single 3D Faceted Diamond)
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
      <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-md" />
      <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-[0_4px_8px_rgba(6,182,212,0.4)]" fill="none">
        <defs>
          <linearGradient id="singleGem" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="25%" stopColor="#67e8f9" />
            <stop offset="70%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </linearGradient>
        </defs>
        <polygon points="24,7 37,20 24,41 11,20" fill="url(#singleGem)" stroke="#7dd3fc" strokeWidth="1.2" />
        <polygon points="24,7 11,20 24,20" fill="#ffffff" opacity="0.75" />
        <polygon points="11,20 24,20 24,41" fill="#38bdf8" opacity="0.6" />
        <polygon points="24,7 37,20 24,41" fill="#0369a1" opacity="0.45" />
        <polygon points="24,12 29,20 24,26 19,20" fill="#e0f2fe" opacity="0.8" />
        <path d="M34 10 L35 12 L37 13 L35 14 L34 16 L33 14 L31 13 L33 12 Z" fill="#ffffff" />
      </svg>
    </div>
  );
}
