import { describe, expect, it } from "vitest";
import { deduplicatePublicResults, generateSearchVariants, mapPublicProviderRow, normalizeArabic, rankPublicResults, searchPublicTelegram, type PublicEntityResult } from "./telegramSearch";

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
      language: null, matchType: "", score: 0, publicUrl: username ? `https://t.me/${username}` : null, evidenceUrl: null,
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

  it("maps the live message-shaped provider row to a public chat card without exposing the message body", () => {
    const result = mapPublicProviderRow({
      id: 21792,
      text: "The new song is available today",
      date: "2026-08-19T13:56:34+00:00",
      chat: { title: "Minecraft Discussion", username: "MinecraftDiscussion" },
      url: "https://t.me/MinecraftDiscussion/21792",
    }, "song");

    expect(result).toMatchObject({ title: "Minecraft Discussion", username: "MinecraftDiscussion", publicUrl: "https://t.me/MinecraftDiscussion", evidenceUrl: "https://t.me/MinecraftDiscussion/21792", matchType: "مطابقة ضمن إشارة عامة" });
    expect(result?.description).not.toContain("new song");
  });

  it("deduplicates multiple message matches from the same public channel", () => {
    const first = mapPublicProviderRow({ id: 1, text: "song", chat: { title: "Public Music", username: "publicmusic" }, url: "https://t.me/publicmusic/1" }, "song")!;
    const second = mapPublicProviderRow({ id: 2, text: "another song", chat: { title: "Public Music", username: "publicmusic" }, url: "https://t.me/publicmusic/2" }, "song")!;
    expect(deduplicatePublicResults([first, second])).toHaveLength(1);
  });
});
