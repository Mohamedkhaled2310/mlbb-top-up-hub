export interface SavedPlayerAccount {
  id: string;
  zoneId?: string | undefined;
  name?: string | undefined;
  region?: string | undefined;
  gameId: string;
  lastUsedAt: number;
}

const STORAGE_KEY = "meto_recent_player_accounts_v1";
const MAX_ACCOUNTS_PER_GAME = 5;

export function getRecentAccounts(gameId?: string): SavedPlayerAccount[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedPlayerAccount[];
    if (!Array.isArray(list)) return [];
    const filtered = gameId ? list.filter((a) => a.gameId === gameId) : list;
    return filtered.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
  } catch {
    return [];
  }
}

export function saveRecentAccount(account: {
  id: string;
  zoneId?: string | undefined;
  name?: string | undefined;
  region?: string | undefined;
  gameId: string;
}): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const cleanId = (account.id || "").trim();
  if (!cleanId) return;

  try {
    const existing = getRecentAccounts();
    const game = account.gameId || "mlbb";
    const zone = (account.zoneId || "").trim();

    // Match by game + id + zone
    const remaining = existing.filter(
      (a) => !(a.gameId === game && a.id === cleanId && (a.zoneId || "").trim() === zone),
    );

    const updated: SavedPlayerAccount = {
      id: cleanId,
      zoneId: zone || undefined,
      name: (account.name || "").trim() || undefined,
      region: (account.region || "").trim() || undefined,
      gameId: game,
      lastUsedAt: Date.now(),
    };

    // Keep up to MAX_ACCOUNTS_PER_GAME for this game
    const thisGameList = [updated, ...remaining.filter((a) => a.gameId === game)].slice(
      0,
      MAX_ACCOUNTS_PER_GAME,
    );
    const otherGameList = remaining.filter((a) => a.gameId !== game);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...thisGameList, ...otherGameList]));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearRecentAccounts(gameId?: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (!gameId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const existing = getRecentAccounts();
    const remaining = existing.filter((a) => a.gameId !== gameId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // Ignore storage errors
  }
}

