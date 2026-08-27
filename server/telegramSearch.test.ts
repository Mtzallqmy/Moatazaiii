import { describe, expect, it } from "vitest";
import { generateSearchVariants, normalizeArabic, rankPublicResults, searchPublicTelegram, type PublicEntityResult } from "./telegramSearch";

describe("telegram public search privacy and normalization", () => {
  it("normalizes common Arabic variants without creating an identity inference", () => {
    expect(normalizeArabic("إدارةُ القناة")).toBe("اداره القناه");
    expect(generateSearchVariants("@Public_Chat")).toContain("Public_Chat");
  });

  it("extracts a safe public username from a Telegram URL", () => {
    expect(generateSearchVariants("https://t.me/telegram")[0]).toBe("telegram");
  });

  it("rejects phone-number-shaped input before calling a provider", async () => {
    const response = await searchPublicTelegram("+20 (10) 1234-5678");
    expect(response.status).toBe("restricted");
    expect(response.results).toEqual([]);
  });

  it("ranks an exact public username match ahead of title-only and description-only matches", () => {
    const source = (title: string, username: string | null, description: string | null): PublicEntityResult => ({
      id: title, kind: "channel", title, username, description, photoUrl: null, publicStats: null,
      language: null, matchType: "", score: 0, publicUrl: username ? `https://t.me/${username}` : null,
      canMessage: false, sourceUpdatedAt: null,
    });
    const ranked = rankPublicResults([
      source("مجتمع عام", null, "يتحدث عن alpha"),
      source("Alpha Network", null, null),
      source("قناة عامة", "alpha", null),
    ], "alpha");

    expect(ranked.map(item => item.username ?? item.title)).toEqual(["alpha", "Alpha Network", "مجتمع عام"]);
    expect(ranked[0]?.matchType).toBe("مطابقة المعرّف الدقيقة");
  });
});
