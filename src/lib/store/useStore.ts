import { useSyncExternalStore } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { TopUpPackage, CartItem, PlayerInfo } from "@/types/store";

const env: any = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.M_TOO_SUPABASE_URL || (typeof process !== "undefined" ? (process.env?.SUPABASE_URL || process.env?.M_TOO_SUPABASE_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL) : "") || "";
const supabaseAnon = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.M_TOO_SUPABASE_PUBLISHABLE_KEY || env.M_TOO_SUPABASE_ANON_KEY || (typeof process !== "undefined" ? (process.env?.SUPABASE_PUBLISHABLE_KEY || process.env?.SUPABASE_ANON_KEY || process.env?.M_TOO_SUPABASE_PUBLISHABLE_KEY || process.env?.M_TOO_SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) : "") || "";
export const supabase = (supabaseUrl && supabaseAnon)
  ? createClient<Database>(supabaseUrl, supabaseAnon)
  : null;

type Settings = { egp_rate: number; fazer_balance?: number | null; fazer_balance_currency?: string | null; fazer_balance_updated_at?: string | null; packages_synced_at?: string | null };

interface StoreState {
  packages: TopUpPackage[];
  settings: Settings;
  player: PlayerInfo;
  cart: CartItem[];
  isMerchant: boolean;
  accessToken: string | null;
  merchant: any | null;
  profile: any | null;
  setPackages: (pkgs: TopUpPackage[]) => void;
  setSettings: (s: Partial<Settings>) => void;
  setPlayer: (p: PlayerInfo) => void;
  addToCart: (pkg: TopUpPackage) => void;
  updateCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setAuth: (token: string | null, profile?: any, merchant?: any) => void;
}

let state: StoreState;
const listeners = new Set<() => void>();
function setState(partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) {
  const next = typeof partial === "function" ? (partial as any)(state) : partial;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
function getState() { return state; }

state = {
  packages: [],
  settings: { egp_rate: 50 },
  player: { id: "", zoneId: "", region: "" },
  cart: [],
  isMerchant: false,
  accessToken: null,
  merchant: null,
  profile: null,
  setPackages: (packages) => setState({ packages }),
  setSettings: (s) => setState({ settings: { ...getState().settings, ...s } }),
  setPlayer: (player) => setState({ player }),
  addToCart: (pkg) => setState((st) => {
    const ex = st.cart.find((c) => c.package.id === pkg.id);
    if (ex) return { cart: st.cart.map((c) => c.package.id === pkg.id ? { ...c, qty: Math.min(20, c.qty + 1) } : c) };
    return { cart: [...st.cart, { package: pkg, qty: 1 }] };
  }),
  updateCartQty: (id, qty) => setState((st) => ({ cart: st.cart.map((c) => c.package.id === id ? { ...c, qty: Math.max(1, qty) } : c) })),
  removeFromCart: (id) => setState((st) => ({ cart: st.cart.filter((c) => c.package.id !== id) })),
  clearCart: () => setState({ cart: [] }),
  setAuth: (accessToken, profile, merchant) => setState({ accessToken, profile: profile ?? null, merchant: merchant ?? null, isMerchant: !!merchant && !!accessToken }),
};

export function useStore<T = StoreState>(selector?: (s: StoreState) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => (selector ? selector(getState()) : (getState() as any)),
    () => (selector ? selector(getState()) : (getState() as any)),
  );
}
