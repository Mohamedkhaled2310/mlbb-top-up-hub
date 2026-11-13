import { useSyncExternalStore } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AuthSessionPayload, CartItem, PlayerInfo, TopUpPackage } from "@/types/store";

const env: Record<string, string | undefined> = ((import.meta as any).env || {}) as Record<string, string | undefined>;
const pEnv: Record<string, string | undefined> | undefined =
  typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : undefined;

const supabaseUrl =
  env["M_TOO_SUPABASE_URL"] ||
  env["NEXT_PUBLIC_SUPABASE_URL"] ||
  env["VITE_SUPABASE_URL"] ||
  env["SUPABASE_URL"] ||
  pEnv?.["M_TOO_SUPABASE_URL"] ||
  pEnv?.["NEXT_PUBLIC_SUPABASE_URL"] ||
  pEnv?.["SUPABASE_URL"] ||
  "";

const supabaseAnon =
  env["M_TOO_SUPABASE_ANON_KEY"] ||
  env["M_TOO_SUPABASE_PUBLISHABLE_KEY"] ||
  env["NEXT_PUBLIC_M_TOO_SUPABASE_ANON_KEY"] ||
  env["NEXT_PUBLIC_M_TOO_SUPABASE_PUBLISHABLE_KEY"] ||
  env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
  env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  env["SUPABASE_ANON_KEY"] ||
  env["SUPABASE_PUBLISHABLE_KEY"] ||
  pEnv?.["M_TOO_SUPABASE_ANON_KEY"] ||
  pEnv?.["M_TOO_SUPABASE_PUBLISHABLE_KEY"] ||
  pEnv?.["NEXT_PUBLIC_M_TOO_SUPABASE_ANON_KEY"] ||
  pEnv?.["NEXT_PUBLIC_M_TOO_SUPABASE_PUBLISHABLE_KEY"] ||
  pEnv?.["SUPABASE_ANON_KEY"] ||
  pEnv?.["SUPABASE_PUBLISHABLE_KEY"] ||
  "";

export const supabase = supabaseUrl && supabaseAnon ? createClient<Database>(supabaseUrl, supabaseAnon) : null;

const AUTH_STORAGE_KEY = "meto_auth_session_v1";

export type Settings = {
  egp_rate: number;
  fazer_balance?: number | null | undefined;
  fazer_balance_currency?: string | null | undefined;
  fazer_balance_updated_at?: string | null | undefined;
  packages_synced_at?: string | null | undefined;
  fx_rates?: Record<string, number> | undefined;
  fx_updated_at?: string | null | undefined;
  egp_rate_mode?: "manual" | "binance_auto" | undefined;
  binance_rate?: number | null | undefined;
  binance_updated_at?: string | null | undefined;
};

interface StoreState {
  packages: TopUpPackage[];
  settings: Settings;
  player: PlayerInfo;
  cart: CartItem[];
  isMerchant: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  userEmail: string | null;
  merchant: any | null;
  profile: any | null;
  setPackages: (pkgs: TopUpPackage[]) => void;
  setSettings: (s: Partial<Settings>) => void;
  setPlayer: (p: PlayerInfo) => void;
  addToCart: (pkg: TopUpPackage) => void;
  updateCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setAuth: (
    token: string | null,
    profile?: any,
    merchant?: any,
    sessionMeta?: { refreshToken?: string | null | undefined; expiresAt?: number | null | undefined; email?: string | null | undefined },
    rememberMe?: boolean
  ) => void;
  logout: () => void;
}

let state: StoreState;
const listeners = new Set<() => void>();

function setState(partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) {
  const next = typeof partial === "function" ? partial(state) : partial;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function getState() {
  return state;
}

function saveStoredAuth(payload: {
  accessToken: string | null;
  refreshToken?: string | null | undefined;
  expiresAt?: number | null | undefined;
  profile?: any;
  merchant?: any;
  userEmail?: string | null | undefined;
  rememberMe?: boolean;
}) {
  if (typeof window === "undefined") return;
  try {
    if (!payload.accessToken) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    const data = JSON.stringify(payload);
    if (payload.rememberMe !== false) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, data);
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, data);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStoredAuth(): (Partial<AuthSessionPayload> & {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  userEmail?: string | null;
  rememberMe?: boolean;
}) | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLocal = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (fromLocal) {
      const parsed = JSON.parse(fromLocal);
      if (parsed?.accessToken) return { ...parsed, rememberMe: true };
    }
    const fromSession = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (fromSession) {
      const parsed = JSON.parse(fromSession);
      if (parsed?.accessToken) return { ...parsed, rememberMe: false };
    }
    return null;
  } catch {
    return null;
  }
}

state = {
  packages: [],
  settings: { egp_rate: 50 },
  player: { id: "", zoneId: "", region: "" },
  cart: [],
  isMerchant: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  userEmail: null,
  merchant: null,
  profile: null,
  setPackages: (packages) => setState({ packages }),
  setSettings: (s) => setState({ settings: { ...getState().settings, ...s } }),
  setPlayer: (player) => setState({ player }),
  addToCart: (pkg) =>
    setState((st) => {
      const currentGame = st.cart[0]?.package.gameId;
      const incomingGame = pkg.gameId;
      if (st.cart.length > 0 && currentGame && incomingGame && currentGame !== incomingGame) {
        return { cart: [{ package: pkg, packageId: pkg.offerId, qty: 1 }] };
      }
      const ex = st.cart.find((c) => c.package.id === pkg.id);
      if (ex) {
        return {
          cart: st.cart.map((c) => (c.package.id === pkg.id ? { ...c, qty: Math.min(20, c.qty + 1) } : c)),
        };
      }
      return { cart: [...st.cart, { package: pkg, packageId: pkg.offerId, qty: 1 }] };
    }),
  updateCartQty: (id, qty) =>
    setState((st) => ({
      cart: st.cart.map((c) => (c.package.id === id ? { ...c, qty: Math.min(20, Math.max(1, qty)) } : c)),
    })),
  removeFromCart: (id) => setState((st) => ({ cart: st.cart.filter((c) => c.package.id !== id) })),
  clearCart: () => setState({ cart: [] }),
  setAuth: (accessToken, profile, merchant, sessionMeta, rememberMe = true) => {
    const nextRefresh = sessionMeta?.refreshToken ?? (accessToken ? state.refreshToken : null);
    const nextExp = sessionMeta?.expiresAt ?? (accessToken ? state.expiresAt : null);
    const nextEmail = sessionMeta?.email ?? (accessToken ? state.userEmail : null);
    saveStoredAuth({
      accessToken,
      refreshToken: nextRefresh,
      expiresAt: nextExp,
      profile: profile ?? null,
      merchant: merchant ?? null,
      userEmail: nextEmail,
      rememberMe,
    });
    setState({
      accessToken,
      refreshToken: nextRefresh,
      expiresAt: nextExp,
      userEmail: nextEmail,
      profile: profile ?? null,
      merchant: merchant ?? null,
      isMerchant: Boolean(merchant && accessToken),
    });
  },
  logout: () => {
    saveStoredAuth({ accessToken: null });
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setState({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userEmail: null,
      profile: null,
      merchant: null,
      isMerchant: false,
    });
  },
};

export function useStore<T = StoreState>(selector?: (s: StoreState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (selector ? selector(getState()) : (getState() as unknown as T)),
    () => (selector ? selector(getState()) : (getState() as unknown as T)),
  );
}

useStore.getState = getState;
export { getState as getStoreState };
