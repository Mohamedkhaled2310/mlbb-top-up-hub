import React from "react";
import { PackageCategory } from "../types/store";

interface GamePackageIconProps {
  category: PackageCategory;
  diamonds: number;
  bonusDiamonds?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Professional 3D game asset icons for top-up packages:
 * - Weekly Diamond Pass: High-tech holographic pass card with 3D diamond
 * - Double Diamonds (x2): Twin radiant diamonds with glowing 2x golden badge
 * - Small Diamonds (11-86): Single 3D faceted radiant blue MLBB crystal
 * - Medium Diamonds (172-344): Cluster of radiant crystals
 * - Large Diamonds (429-1412): Glowing pouch overflowing with diamonds
 * - Mega Chest (2195-6000): Legendary golden chest overflowing with diamonds
 * - Bundles: Mythic glowing crest / Twilight Pass badge
 */
export function GamePackageIcon({
  category,
  diamonds,
  bonusDiamonds,
  className = "",
  size = "md",
}: GamePackageIconProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-16 h-16",
  }[size];

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
          {/* Card Base */}
          <rect x="4" y="8" width="40" height="32" rx="6" fill="url(#wpCardGrad)" stroke="#a855f7" strokeWidth="1.5" />
          {/* Inner Card Border */}
          <rect x="7" y="11" width="34" height="26" rx="4" stroke="#c084fc" strokeWidth="0.8" strokeDasharray="2 2" fill="none" opacity="0.6" />
          {/* Calendar Top Rings */}
          <circle cx="14" cy="8" r="1.5" fill="#f8fafc" />
          <circle cx="24" cy="8" r="1.5" fill="#f8fafc" />
          <circle cx="34" cy="8" r="1.5" fill="#f8fafc" />
          {/* Central 3D Diamond */}
          <polygon points="24,14 33,23 24,34 15,23" fill="url(#wpGemGrad)" />
          <polygon points="24,14 24,34 33,23" fill="#0891b2" opacity="0.6" />
          <polygon points="24,14 15,23 24,23" fill="#a5f3fc" opacity="0.8" />
          {/* Shimmer Star */}
          <path d="M35 12 L36 15 L39 16 L36 17 L35 20 L34 17 L31 16 L34 15 Z" fill="url(#wpGoldGrad)" />
          {/* Mini 7D ribbon */}
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
          {/* Back Diamond */}
          <polygon points="18,12 28,22 18,34 8,22" fill="url(#ddGem1)" opacity="0.85" />
          <polygon points="18,12 18,34 28,22" fill="#0369a1" opacity="0.6" />
          {/* Front Diamond */}
          <polygon points="30,10 40,22 30,36 20,22" fill="url(#ddGem2)" stroke="#7dd3fc" strokeWidth="0.8" />
          <polygon points="30,10 30,36 40,22" fill="#0e7490" opacity="0.5" />
          <polygon points="30,10 20,22 30,22" fill="#bae6fd" opacity="0.9" />
          {/* Golden x2 Badge */}
          <circle cx="16" cy="33" r="8.5" fill="url(#goldBadge)" stroke="#fef08a" strokeWidth="1" />
          <text x="16" y="36.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#451a03">x2</text>
          {/* Golden Sparkle */}
          <path d="M38 10 L39 12 L41 13 L39 14 L38 16 L37 14 L35 13 L37 12 Z" fill="#fde047" />
        </svg>
      </div>
    );
  }

  // 3. Bundles (The Bundle / Twilight Pass)
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
          {/* Box Bottom */}
          <rect x="8" y="18" width="32" height="24" rx="4" fill="url(#bundleBox)" stroke="#34d399" strokeWidth="1.2" />
          {/* Box Lid */}
          <rect x="6" y="14" width="36" height="8" rx="3" fill="#059669" stroke="#6ee7b7" strokeWidth="1.2" />
          {/* Vertical Ribbon */}
          <rect x="21" y="14" width="6" height="28" fill="url(#bundleRibbon)" />
          {/* Ribbon Bow */}
          <ellipse cx="19" cy="12" rx="4" ry="2.5" fill="#fef08a" transform="rotate(-20 19 12)" />
          <ellipse cx="29" cy="12" rx="4" ry="2.5" fill="#fef08a" transform="rotate(20 29 12)" />
          <circle cx="24" cy="13" r="2.5" fill="#d97706" />
          {/* Floating Gem on top */}
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
          {/* Open Chest Bottom */}
          <path d="M8 24 L40 24 L37 42 L11 42 Z" fill="url(#chestBody)" stroke="#f59e0b" strokeWidth="1.5" />
          {/* Open Chest Lid (Tilted Back) */}
          <path d="M6 18 L42 18 L39 10 L9 10 Z" fill="#b45309" stroke="#fbbf24" strokeWidth="1.2" />
          {/* Piles of Sparkling Diamonds Overflowing */}
          <polygon points="24,12 30,19 24,26 18,19" fill="url(#gemGlow)" />
          <polygon points="16,16 21,21 17,27 12,22" fill="#38bdf8" />
          <polygon points="32,16 37,22 32,27 27,21" fill="#67e8f9" />
          <polygon points="20,19 25,24 20,28 15,23" fill="#bae6fd" opacity="0.9" />
          <polygon points="28,19 33,23 28,28 23,24" fill="#a5f3fc" />
          {/* Keyhole Lock */}
          <rect x="22" y="28" width="4" height="6" rx="1.5" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
          {/* Magic Light Beams */}
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
          {/* Velvet Sack Body */}
          <path d="M14 20 C10 32 10 40 18 42 C24 43 24 43 30 42 C38 40 38 32 34 20 Z" fill="url(#sackGrad)" stroke="#38bdf8" strokeWidth="1.2" />
          {/* Gold Tie String */}
          <ellipse cx="24" cy="20" rx="9" ry="2.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" />
          {/* Overflowing Diamond Cluster on top */}
          <polygon points="24,8 30,15 24,22 18,15" fill="url(#gemPouch)" />
          <polygon points="24,8 24,22 30,15" fill="#0284c7" opacity="0.6" />
          <polygon points="24,8 18,15 24,15" fill="#bae6fd" opacity="0.85" />
          {/* Side secondary gems */}
          <polygon points="17,14 21,18 17,22 13,18" fill="#67e8f9" />
          <polygon points="31,14 35,18 31,22 27,18" fill="#38bdf8" />
          {/* Shimmer sparkle */}
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
          {/* Left Diamond */}
          <polygon points="14,18 22,26 14,36 6,26" fill="url(#clusterSide)" opacity="0.85" stroke="#38bdf8" strokeWidth="0.8" />
          {/* Right Diamond */}
          <polygon points="34,18 42,26 34,36 26,26" fill="url(#clusterSide)" opacity="0.85" stroke="#38bdf8" strokeWidth="0.8" />
          {/* Center Main Diamond (Larger & In Front) */}
          <polygon points="24,10 33,21 24,34 15,21" fill="url(#clusterMain)" stroke="#bae6fd" strokeWidth="1.2" />
          <polygon points="24,10 24,34 33,21" fill="#0369a1" opacity="0.55" />
          <polygon points="24,10 15,21 24,21" fill="#cffafe" opacity="0.9" />
          {/* Light Glint */}
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
        {/* Main Diamond Outer */}
        <polygon points="24,7 37,20 24,41 11,20" fill="url(#singleGem)" stroke="#7dd3fc" strokeWidth="1.2" />
        {/* Facet Top Left Highlight */}
        <polygon points="24,7 11,20 24,20" fill="#ffffff" opacity="0.75" />
        {/* Facet Bottom Left */}
        <polygon points="11,20 24,20 24,41" fill="#38bdf8" opacity="0.6" />
        {/* Facet Right Shadow */}
        <polygon points="24,7 37,20 24,41" fill="#0369a1" opacity="0.45" />
        {/* Central Crown Facet */}
        <polygon points="24,12 29,20 24,26 19,20" fill="#e0f2fe" opacity="0.8" />
        {/* Sparkle */}
        <path d="M34 10 L35 12 L37 13 L35 14 L34 16 L33 14 L31 13 L33 12 Z" fill="#ffffff" />
      </svg>
    </div>
  );
}
