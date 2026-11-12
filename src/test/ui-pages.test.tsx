import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CheckoutModal from "../components/CheckoutModal";
import { GamesSection } from "../components/GamesSection";
import { PlayerIdGuideModal } from "../components/PlayerIdGuideModal";
import { Footer } from "../components/Footer";
import { useStore } from "../lib/store/useStore";
import * as apiClient from "../lib/api-client";
import type { TopUpPackage } from "../types/store";

const samplePackage: TopUpPackage = {
  id: "ml_86",
  offerId: "ml_86",
  gameId: "mlbb",
  fazerCategoryId: "cat_mlbb",
  name: "86 Diamonds",
  category: "diamonds",
  diamonds: 86,
  costUsd: 2,
  retailPriceEgp: 115,
  merchantBasePriceEgp: 108,
  active: true,
};

describe("UI Components & Flows", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders CheckoutModal safely across open=false and open=true, applies merchant discount, and advances through full checkout", async () => {
    const onOrderSuccess = vi.fn();
    vi.spyOn(apiClient, "validatePlayerApi").mockResolvedValue({
      valid: true,
      username: "TestPlayer#2024",
      accountRegion: "global",
    });
    vi.spyOn(apiClient, "submitOrderApi").mockResolvedValue({
      success: true,
      order_ref: "ORD-TEST-1",
      status: "success",
      balance_egp: 903,
      message: "تم التنفيذ بنجاح",
    });

    const Wrapper = ({ open }: { open: boolean }) => {
      const store = useStore();
      return (
        <div>
          <button
            onClick={() =>
              store.setAuth("tok-1", { id: "u1", role: "merchant" }, { id: "m1", balance_egp: 1000, margin_percent: 10, is_active: true })
            }
          >
            seed-merchant
          </button>
          <CheckoutModal
            open={open}
            onClose={() => {}}
            cart={[{ package: samplePackage, qty: 1 }]}
            onUpdateQty={store.updateCartQty}
            onRemove={store.removeFromCart}
            onClear={store.clearCart}
            onOrderSuccess={onOrderSuccess}
          />
        </div>
      );
    };

    const { rerender } = render(<Wrapper open={false} />);
    expect(screen.queryByText("بيانات الشحن")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("seed-merchant"));
    rerender(<Wrapper open={true} />);

    expect(screen.getByText("بيانات الشحن")).toBeInTheDocument();
    expect(screen.getByText("86 Diamonds")).toBeInTheDocument();
    // Cost $2 * 50 EGP * 1.075 * 0.9 = 96.75 -> ceil = 97 EGP
    expect(screen.getByText("97 ج.م")).toBeInTheDocument();

    const playerInput = screen.getByPlaceholderText("مثال: 12345678");
    const zoneInput = screen.getByPlaceholderText("مثال: 2024");
    fireEvent.change(playerInput, { target: { value: "12345678" } });
    fireEvent.change(zoneInput, { target: { value: "2024" } });

    fireEvent.click(screen.getByRole("button", { name: /تحقق ومتابعة/i }));
    await waitFor(() => {
      expect(screen.getByText("مراجعة الطلب")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /تأكيد وإرسال الطلب/i }));
    await waitFor(() => {
      expect(screen.getByText("ORD-TEST-1")).toBeInTheDocument();
    });
    expect(onOrderSuccess).toHaveBeenCalledTimes(1);
  });

  it("renders all 4 supported games with live package counts and triggers game switching", () => {
    const onSelect = vi.fn();
    render(
      <GamesSection
        selectedGameId="mlbb"
        onSelectGame={onSelect}
        packageCounts={{ mlbb: 12, pubg: 8, freefire: 6, hok: 5 }}
      />,
    );

    expect(screen.getByText("Mobile Legends: Bang Bang")).toBeInTheDocument();
    expect(screen.getByText("PUBG Mobile (ببجي موبايل)")).toBeInTheDocument();
    expect(screen.getByText("Free Fire (فري فاير)")).toBeInTheDocument();
    expect(screen.getByText("Honor of Kings (أونر أوف كينجز)")).toBeInTheDocument();
    expect(screen.getByText("8 باقة")).toBeInTheDocument();

    fireEvent.click(screen.getByText("PUBG Mobile (ببجي موبايل)"));
    expect(onSelect).toHaveBeenCalledWith("pubg");
  });

  it("renders PlayerIdGuideModal safely and renders Footer cleanly", () => {
    render(
      <div>
        <PlayerIdGuideModal open={true} onOpenChange={() => {}} gameId="pubg" />
        <Footer />
      </div>,
    );

    expect(screen.getByText(/PUBG Mobile/)).toBeInTheDocument();
    expect(screen.getAllByText(/METO STORE/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/01070459339/)).toBeInTheDocument();
  });
});
