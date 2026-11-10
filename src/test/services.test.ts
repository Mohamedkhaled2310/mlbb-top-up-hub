import { describe, expect, it } from "vitest";
import { BinancePayService } from "../server/binancepay.service";
import { FazerCardsService } from "../server/fazercards.service";

describe("Binance Pay & FazerCards Services", () => {
  it("generates a valid 128-character HMAC-SHA512 uppercase signature for Binance Pay", () => {
    const timestamp = "1700000000000";
    const nonce = "abcdef1234567890abcdef1234567890";
    const body = '{"merchantTradeNo":"MLBB_123","totalFee":1.50,"currency":"USDT"}';
    const secretKey = "test_secret_key";

    const signature = BinancePayService.generateSignature(timestamp, nonce, body, secretKey);

    expect(signature).toBeDefined();
    expect(signature.length).toBe(128); // 512 bits / 4 bits per hex char = 128 chars
    expect(signature).toBe(signature.toUpperCase());
  });

  it("validates player input format correctly", async () => {
    // Invalid empty
    const emptyRes = await FazerCardsService.validatePlayer("", "");
    expect(emptyRes.valid).toBe(false);

    // Invalid short player ID
    const shortRes = await FazerCardsService.validatePlayer("123", "1234");
    expect(shortRes.valid).toBe(false);

    // Valid format
    const validRes = await FazerCardsService.validatePlayer("123456789", "2024");
    expect(validRes.valid).toBe(true);
    expect(validRes.username).toBeDefined();
  });
});
