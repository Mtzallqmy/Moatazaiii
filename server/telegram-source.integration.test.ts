import { describe, expect, it } from "vitest";

const baseUrl = process.env.TELEGRAM_PUBLIC_SEARCH_BASE_URL?.replace(/\/$/, "");
const apiKey = process.env.TELEGRAM_PUBLIC_SEARCH_API_KEY;

describe("Telegram public search source", () => {
  it("authenticates to the provider health endpoint without exposing the key", async () => {
    expect(baseUrl).toMatch(/^https:\/\//);
    expect(apiKey).toBeTruthy();

    const response = await fetch(`${baseUrl}/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.ok).toBe(true);
  });
});
