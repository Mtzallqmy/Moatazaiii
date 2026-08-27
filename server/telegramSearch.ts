import { ENV } from "./_core/env";
import * as db from "./db";

export type PublicEntityResult = {
  id: string;
  kind: "channel" | "group" | "user";
  title: string;
  username: string | null;
  description: string | null;
  photoUrl: string | null;
  publicStats: { label: string; value: number } | null;
  language: string | null;
  matchType: string;
  score: number;
  publicUrl: string | null;
  canMessage: boolean;
  sourceUpdatedAt: string | null;
};

export type SearchResponse = {
  status: "ok" | "restricted" | "source_not_configured" | "source_unavailable";
  message?: string;
  results: PublicEntityResult[];
  suggestions: string[];
  sourceLabel: string;
};

type ProviderRow = Record<string, unknown>;
const queryCache = new Map<string, { expiresAt: number; response: SearchResponse }>();
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{5,32}$/;
const PHONE_PATTERN = /^\+?\d(?:[\s()\-]*\d){6,}$/;

export function normalizeArabic(value: string) {
  return value.normalize("NFKD").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ة/g, "ه").toLocaleLowerCase();
}

export function generateSearchVariants(raw: string) {
  const value = raw.trim();
  const usernameFromUrl = value.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,32})\/?$/i)?.[1];
  const username = usernameFromUrl ?? (value.startsWith("@") ? value.slice(1) : "");
  const primary = username && USERNAME_PATTERN.test(username) ? username : value;
  const folded = normalizeArabic(primary);
  const noAt = primary.replace(/^@/, "");
  const candidates = [primary, noAt, folded].filter(item => item.length > 0 && item.length <= 100);
  return candidates.filter((item, index) => candidates.indexOf(item) === index).slice(0, 3);
}

function isRestrictedInput(value: string) {
  return PHONE_PATTERN.test(value.trim());
}

function publicUrlFor(username: string | null) {
  return username && USERNAME_PATTERN.test(username) ? `https://t.me/${username}` : null;
}

function readString(row: ProviderRow, fields: string[]) {
  for (const field of fields) { const value = row[field]; if (typeof value === "string" && value.trim()) return value.trim(); }
  return null;
}

function readNumber(row: ProviderRow, fields: string[]) {
  for (const field of fields) { const value = row[field]; if (typeof value === "number" && Number.isFinite(value)) return value; }
  return null;
}

function scoreResult(item: Pick<PublicEntityResult, "title" | "username" | "description" | "language" | "publicStats">, query: string) {
  const needle = normalizeArabic(query).replace(/^@/, "");
  const username = item.username?.toLocaleLowerCase() ?? "";
  const title = normalizeArabic(item.title);
  const description = normalizeArabic(item.description ?? "");
  let score = username === needle ? 100 : username.startsWith(needle) ? 85 : username.includes(needle) ? 70 : title === needle ? 65 : title.startsWith(needle) ? 55 : title.includes(needle) ? 45 : description.includes(needle) ? 20 : 5;
  if (item.language && normalizeArabic(item.language) === needle) score += 2;
  if (item.publicStats?.value) score += Math.min(8, Math.floor(Math.log10(Math.max(1, item.publicStats.value))));
  return score;
}

function matchType(item: Pick<PublicEntityResult, "title" | "username" | "description">, query: string) {
  const needle = normalizeArabic(query).replace(/^@/, "");
  if (item.username?.toLocaleLowerCase() === needle) return "مطابقة المعرّف الدقيقة";
  if (item.username?.toLocaleLowerCase().includes(needle)) return "مطابقة المعرّف";
  if (normalizeArabic(item.title).includes(needle)) return "مطابقة الاسم العام";
  if (normalizeArabic(item.description ?? "").includes(needle)) return "مطابقة الوصف العام";
  return "مطابقة من المصدر";
}

export function rankPublicResults(results: PublicEntityResult[], query: string) {
  return results.map(result => ({
    ...result,
    matchType: matchType(result, query),
    score: scoreResult(result, query),
  })).sort((a, b) => b.score - a.score);
}

function mapProviderRow(row: ProviderRow, query: string): PublicEntityResult | null {
  // نستخرج بيانات تعريف القناة فقط، ولا نعرض نص رسالة مصدرها الوسيط.
  const usernameRaw = readString(row, ["username", "channel_username", "channelUsername", "public_username"]);
  const username = usernameRaw?.replace(/^@/, "") ?? null;
  const title = readString(row, ["channel_title", "channelTitle", "title", "name"]);
  if (!title && !username) return null;
  const rawKind = readString(row, ["kind", "type", "chat_type"]);
  const kind: PublicEntityResult["kind"] = rawKind === "group" || rawKind === "user" ? rawKind : "channel";
  const description = readString(row, ["channel_description", "channelDescription", "description", "bio"]);
  const photoUrl = readString(row, ["channel_photo_url", "channelPhotoUrl", "photo_url", "photoUrl"]);
  const language = readString(row, ["language", "lang", "channel_language"]);
  const statValue = readNumber(row, ["subscriber_count", "subscribers", "members_count", "members", "followers"]);
  const candidate = { title: title ?? `@${username}`, username: username && USERNAME_PATTERN.test(username) ? username : null, description, language, publicStats: statValue === null ? null : { label: kind === "channel" ? "مشترك" : "متابع", value: statValue } };
  const id = readString(row, ["id", "channel_id", "channelId"]) ?? `${kind}:${candidate.username ?? normalizeArabic(candidate.title)}`;
  return { id, kind, ...candidate, photoUrl, matchType: matchType(candidate, query), score: scoreResult(candidate, query), publicUrl: publicUrlFor(candidate.username), canMessage: kind === "user" && Boolean(candidate.username), sourceUpdatedAt: readString(row, ["updated_at", "updatedAt", "source_updated_at"]) };
}

async function callProvider(query: string, limit: number) {
  const url = new URL(`${ENV.telegramPublicSearchBaseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, { headers: { "X-API-Key": ENV.telegramPublicSearchApiKey, Authorization: `Bearer ${ENV.telegramPublicSearchApiKey}` }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
  const payload = await response.json() as { results?: unknown };
  return Array.isArray(payload.results) ? payload.results.filter((row): row is ProviderRow => Boolean(row && typeof row === "object")) : [];
}

export async function searchPublicTelegram(query: string): Promise<SearchResponse> {
  const input = query.trim();
  const suggestions = generateSearchVariants(input);
  if (isRestrictedInput(input)) return { status: "restricted", message: "لا يدعم الدليل البحث بأرقام الهواتف أو استخدام الأرقام لاستنتاج هوية الأشخاص.", results: [], suggestions: [], sourceLabel: "حارس الخصوصية" };
  if (!input) return { status: "ok", results: [], suggestions: [], sourceLabel: "وسيط رسائل القنوات العامة" };
  if (!ENV.telegramPublicSearchBaseUrl || !ENV.telegramPublicSearchApiKey) return { status: "source_not_configured", results: [], suggestions, sourceLabel: "وسيط رسائل القنوات العامة" };
  const cacheKey = normalizeArabic(input);
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  try {
    const rows = await callProvider(suggestions[0] ?? input, 20);
    const results = rankPublicResults(rows.map(row => mapProviderRow(row, input)).filter((item): item is PublicEntityResult => Boolean(item)), input).slice(0, 20);
    await db.upsertPublicEntities(results.map(result => ({ sourceId: result.id, kind: result.kind, title: result.title, username: result.username, description: result.description, photoUrl: result.photoUrl, language: result.language, statLabel: result.publicStats?.label ?? null, statValue: result.publicStats?.value ?? null, publicUrl: result.publicUrl, canMessage: result.canMessage, sourceUpdatedAt: result.sourceUpdatedAt ? new Date(result.sourceUpdatedAt) : null })));
    const answer: SearchResponse = { status: "ok", results, suggestions, sourceLabel: "وسيط رسائل القنوات العامة" };
    queryCache.set(cacheKey, { expiresAt: Date.now() + 60_000, response: answer });
    return answer;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "SOURCE_ERROR";
    console.warn("[Telegram search] provider unavailable", reason);
    return { status: "source_unavailable", message: "تعذر الوصول إلى المصدر المصرح به أو تم احترام حدّ طلباته.", results: [], suggestions, sourceLabel: "وسيط رسائل القنوات العامة" };
  }
}

export async function refreshPublicEntity(username: string) {
  if (!USERNAME_PATTERN.test(username) || !ENV.telegramPublicSearchBaseUrl || !ENV.telegramPublicSearchApiKey) return 0;
  const rows = await callProvider(username, 5);
  const results = rows.map(row => mapProviderRow(row, username)).filter((item): item is PublicEntityResult => Boolean(item));
  await db.upsertPublicEntities(results.map(result => ({ sourceId: result.id, kind: result.kind, title: result.title, username: result.username, description: result.description, photoUrl: result.photoUrl, language: result.language, statLabel: result.publicStats?.label ?? null, statValue: result.publicStats?.value ?? null, publicUrl: result.publicUrl, canMessage: result.canMessage, sourceUpdatedAt: result.sourceUpdatedAt ? new Date(result.sourceUpdatedAt) : null })));
  return results.length;
}
