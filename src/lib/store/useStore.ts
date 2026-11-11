import { useSyncExternalStore } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { TopUpPackage, CartItem, PlayerInfo } from "@/types/store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || "";
const supabaseAnon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_ANON_KEY || "";
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
