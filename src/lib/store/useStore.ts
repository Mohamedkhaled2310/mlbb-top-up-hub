import { useState, useEffect, useCallback } from "react";
import { TopUpPackage, TopUpOrder, StoreSettings } from "../../types/store";
import { DEFAULT_PACKAGES } from "../data/default-packages";

const STORAGE_KEY_PACKAGES = "mlbb_custom_packages_v1";
const STORAGE_KEY_SETTINGS = "mlbb_store_settings_v1";
const STORAGE_KEY_ORDERS = "mlbb_store_orders_v1";

const DEFAULT_SETTINGS: StoreSettings = {
  usdtToEgpRate: 50.0,
  globalMarkupPercent: 15,
  fazerConnected: false,
  binanceConnected: false,
};

export function useStore() {
  const [packages, setPackages] = useState<TopUpPackage[]>(() => {
    if (typeof window === "undefined") return DEFAULT_PACKAGES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PACKAGES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load packages from storage", e);
    }
    return DEFAULT_PACKAGES;
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load settings from storage", e);
    }
    return DEFAULT_SETTINGS;
  });

  const [orders, setOrders] = useState<TopUpOrder[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load orders from storage", e);
    }
    return [];
  });

  // Listen to cross-tab / storage updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PACKAGES && e.newValue) {
        try {
          setPackages(JSON.parse(e.newValue));
        } catch (err) {
          console.debug(err);
        }
      }
      if (e.key === STORAGE_KEY_SETTINGS && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch (err) {
          console.debug(err);
        }
      }
      if (e.key === STORAGE_KEY_ORDERS && e.newValue) {
        try {
          setOrders(JSON.parse(e.newValue));
        } catch (err) {
          console.debug(err);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Save packages
  const savePackages = useCallback((newPackages: TopUpPackage[]) => {
    setPackages(newPackages);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(newPackages));
      window.dispatchEvent(new Event("storage"));
    }
  }, []);

  // Save settings
  const saveSettings = useCallback((newSettings: StoreSettings) => {
    setSettings(newSettings);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
      window.dispatchEvent(new Event("storage"));
    }
  }, []);

  // Save orders
  const saveOrders = useCallback((newOrders: TopUpOrder[]) => {
    setOrders(newOrders);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(newOrders));
      window.dispatchEvent(new Event("storage"));
    }
  }, []);

  // Update a single package
  const updatePackage = useCallback(
    (id: string, updates: Partial<TopUpPackage>) => {
      setPackages((prev) => {
        const next = prev.map((p) => {
          if (p.id === id) {
            const updated = { ...p, ...updates };
            // If EGP prices changed, sync USDT equivalent or vice versa
            if (updates.retailPriceEgp !== undefined && updates.retailPriceUsdt === undefined) {
              updated.retailPriceUsdt = Number(
                (updates.retailPriceEgp / settings.usdtToEgpRate).toFixed(2),
              );
            }
            if (updates.merchantPriceEgp !== undefined && updates.merchantPriceUsdt === undefined) {
              updated.merchantPriceUsdt = Number(
                (updates.merchantPriceEgp / settings.usdtToEgpRate).toFixed(2),
              );
            }
            return updated;
          }
          return p;
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(next));
        }
        return next;
      });
    },
    [settings.usdtToEgpRate],
  );

  // Add custom package / bundle
  const addPackage = useCallback((newPkg: TopUpPackage) => {
    setPackages((prev) => {
      const next = [newPkg, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Delete package
  const deletePackage = useCallback((id: string) => {
    setPackages((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Apply markup across all packages
  const applyGlobalMarkup = useCallback(
    (markupPercent: number) => {
      setPackages((prev) => {
        const next = prev.map((p) => {
          const factor = 1 + markupPercent / 100;
          const retailUsdt = Number((p.costPriceUsdt * factor).toFixed(2));
          const merchantUsdt = Number(
            (p.costPriceUsdt * (1 + (markupPercent * 0.5) / 100)).toFixed(2),
          );
          const retailEgp = Math.round(retailUsdt * settings.usdtToEgpRate);
          const merchantEgp = Math.round(merchantUsdt * settings.usdtToEgpRate);

          return {
            ...p,
            retailPriceUsdt: retailUsdt,
            retailPriceEgp: retailEgp,
            merchantPriceUsdt: merchantUsdt,
            merchantPriceEgp: merchantEgp,
          };
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(next));
        }
        return next;
      });

      saveSettings({
        ...settings,
        globalMarkupPercent: markupPercent,
      });
    },
    [settings, saveSettings],
  );

  // Update Exchange Rate
  const updateExchangeRate = useCallback(
    (rate: number) => {
      if (rate <= 0) return;
      setPackages((prev) => {
        const next = prev.map((p) => ({
          ...p,
          retailPriceEgp: Math.round(p.retailPriceUsdt * rate),
          merchantPriceEgp: Math.round(p.merchantPriceUsdt * rate),
        }));
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(next));
        }
        return next;
      });

      saveSettings({
        ...settings,
        usdtToEgpRate: rate,
      });
    },
    [settings, saveSettings],
  );

  // Reset to default packages
  const resetToDefaults = useCallback(() => {
    savePackages(DEFAULT_PACKAGES);
    saveSettings(DEFAULT_SETTINGS);
  }, [savePackages, saveSettings]);

  // Record an order
  const addOrder = useCallback((order: TopUpOrder) => {
    setOrders((prev) => {
      const next = [order, ...prev.slice(0, 49)];
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Update order status
  const updateOrderStatus = useCallback(
    (orderId: string, status: TopUpOrder["status"], extra?: Partial<TopUpOrder>) => {
      setOrders((prev) => {
        const next = prev.map((o) =>
          o.id === orderId ? { ...o, status, ...extra, updatedAt: new Date().toISOString() } : o,
        );
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  return {
    packages,
    settings,
    orders,
    updatePackage,
    addPackage,
    deletePackage,
    applyGlobalMarkup,
    updateExchangeRate,
    resetToDefaults,
    addOrder,
    updateOrderStatus,
    saveSettings,
  };
}
