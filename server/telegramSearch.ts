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
  /** رابط رسالة عامة يؤكد سبب ظهور القناة، ولا يعرض محتوى الرسالة داخل البطاقة. */
  evidenceUrl: string | null;
  canMessage: boolean;
  sourceUpdatedAt: string | null;
  /** نص داخلي للاستدلال على المطابقة؛ يحذف قبل إرسال النتيجة للواجهة. */
  _matchText?: string | null;
};

export type SearchResponse = {
  status: "ok" | "restricted" | "source_not_configured" | "source_unavailable";
  message?: string;
  results: PublicEntityResult[];
  suggestions: string[];
  relatedQueries: string[];
  sourceLabel: string;
};

type ProviderRow = Record<string, unknown>;
type ProviderChat = Record<string, unknown>;
const queryCache = new Map<string, { expiresAt: number; response: SearchResponse }>();
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{5,32}$/;
const PHONE_PATTERN = /^\+?\d(?:[\s()\-]*\d){6,}$/;
const MAX_QUERY_VARIANTS = 3;

export function normalizeArabic(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase();
}

function stripMarks(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/** ينتج صيغًا مكافئة إملائيًا فقط، ولا يترجم الأسماء أو يستنتج هوية أو بلدًا. */
export function generateSearchVariants(raw: string) {
  const value = raw.trim();
  const usernameFromUrl = value.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,32})\/?$/i)?.[1];
  const username = usernameFromUrl ?? (value.startsWith("@") ? value.slice(1) : "");
  const primary = username && USERNAME_PATTERN.test(username) ? username : value;
  const compact = primary.replace(/[\s_-]+/g, "");
  const foldedArabic = normalizeArabic(primary);
  const foldedLatin = stripMarks(primary).toLocaleLowerCase();
  const candidates = [primary, primary.replace(/^@/, ""), compact, foldedArabic, foldedLatin]
    .map(item => item.trim())
    .filter(item => item.length > 0 && item.length <= 100);
  return candidates.filter((item, index) => candidates.indexOf(item) === index).slice(0, MAX_QUERY_VARIANTS);
}

function isRestrictedInput(value: string) {
  return PHONE_PATTERN.test(value.trim());
}

function publicUrlFor(username: string | null) {
  return username && USERNAME_PATTERN.test(username) ? `https://t.me/${username}` : null;
}

function readString(row: ProviderRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readNumber(row: ProviderRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function asProviderRow(value: unknown): ProviderRow | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ProviderRow : null;
}

function detectScriptLabel(...values: Array<string | null>) {
  const text = values.filter(Boolean).join(" ");
  if (/[\u0600-\u06FF]/.test(text)) return "العربية";
  if (/[\u0400-\u04FF]/.test(text)) return "السيريلية";
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return "شرق آسيوية";
  if (/[A-Za-zÀ-ÿ]/.test(text)) return "اللاتينية";
  return "غير محددة";
}

function scoreResult(item: Pick<PublicEntityResult, "title" | "username" | "description" | "language" | "publicStats">, query: string, matchText?: string | null) {
  const needle = normalizeArabic(query).replace(/^@/, "");
  const username = item.username?.toLocaleLowerCase() ?? "";
  const title = normalizeArabic(item.title);
  const description = normalizeArabic(item.description ?? "");
  const evidence = normalizeArabic(matchText ?? "");
  let score = username === needle ? 100 : username.startsWith(needle) ? 85 : username.includes(needle) ? 70 : title === needle ? 65 : title.startsWith(needle) ? 55 : title.includes(needle) ? 45 : description.includes(needle) ? 20 : evidence.includes(needle) ? 18 : 5;
  if (item.language && normalizeArabic(item.language) === needle) score += 2;
  if (item.publicStats?.value) score += Math.min(8, Math.floor(Math.log10(Math.max(1, item.publicStats.value))));
  return score;
}

function matchType(item: Pick<PublicEntityResult, "title" | "username" | "description">, query: string, matchText?: string | null) {
  const needle = normalizeArabic(query).replace(/^@/, "");
  if (item.username?.toLocaleLowerCase() === needle) return "مطابقة المعرّف الدقيقة";
  if (item.username?.toLocaleLowerCase().includes(needle)) return "مطابقة المعرّف";
  if (normalizeArabic(item.title).includes(needle)) return "مطابقة الاسم العام";
  if (normalizeArabic(item.description ?? "").includes(needle)) return "مطابقة الوصف العام";
  if (normalizeArabic(matchText ?? "").includes(needle)) return "مطابقة ضمن إشارة عامة";
  return "مطابقة من المصدر";
}

/** يزيل تكرار الرسائل وينتقي أفضل إشارة لكل قناة أو رابط عام. */
export function deduplicatePublicResults(results: PublicEntityResult[]) {
  const unique = new Map<string, PublicEntityResult>();
  for (const result of results) {
    const key = result.username ? `user:${result.username.toLowerCase()}` : result.publicUrl ?? result.evidenceUrl ?? result.id;
    const existing = unique.get(key);
    if (!existing || result.score > existing.score || (result.score === existing.score && Boolean(result.sourceUpdatedAt))) unique.set(key, result);
  }
  return Array.from(unique.values());
}

export function rankPublicResults(results: PublicEntityResult[], query: string) {
  return results.map(({ _matchText, ...result }) => ({
    ...result,
    matchType: matchType(result, query, _matchText),
    score: scoreResult(result, query, _matchText),
  })).sort((a, b) => b.score - a.score);
}

/** يدعم حقول الكيانات المباشرة، وكذلك شكل المصدر الفعلي: { text, date, chat: {title, username}, url }. */
export function mapPublicProviderRow(row: ProviderRow, query: string): PublicEntityResult | null {
  const chat = asProviderRow(row.chat) ?? {};
  const usernameRaw = readString(row, ["username", "channel_username", "channelUsername", "public_username"])
    ?? readString(chat, ["username", "public_username"]);
  const username = usernameRaw?.replace(/^@/, "") ?? null;
  const title = readString(row, ["channel_title", "channelTitle", "title", "name"])
    ?? readString(chat, ["title", "name"]);
  const evidenceUrl = readString(row, ["url", "message_url", "messageUrl"]);
  if (!title && !username && !evidenceUrl) return null;
  const rawKind = readString(row, ["kind", "type", "chat_type"]);
  const kind: PublicEntityResult["kind"] = rawKind === "group" || rawKind === "user" ? rawKind : "channel";
  const rawMessageText = readString(row, ["text", "message", "content"]);
  const description = readString(row, ["channel_description", "channelDescription", "description", "bio"])
    ?? (rawMessageText ? "إشارة عامة متاحة في المصدر — افتح تيليجرام لمراجعة المحتوى العام." : null);
  const photoUrl = readString(row, ["channel_photo_url", "channelPhotoUrl", "photo_url", "photoUrl"]);
  const language = readString(row, ["language", "lang", "channel_language"]) ?? detectScriptLabel(title, rawMessageText);
  const statValue = readNumber(row, ["subscriber_count", "subscribers", "members_count", "members", "followers"]);
  const candidate = {
    title: title ?? `@${username ?? "telegram"}`,
    username: username && USERNAME_PATTERN.test(username) ? username : null,
    description,
    language,
    publicStats: statValue === null ? null : { label: kind === "channel" ? "مشترك" : "متابع", value: statValue },
  };
  const idValue = row.id;
  const id = typeof idValue === "string" || typeof idValue === "number" ? String(idValue) : `${kind}:${candidate.username ?? normalizeArabic(candidate.title)}`;
  return {
    id,
    kind,
    ...candidate,
    photoUrl,
    matchType: matchType(candidate, query, rawMessageText),
    score: scoreResult(candidate, query, rawMessageText),
    publicUrl: publicUrlFor(candidate.username) ?? evidenceUrl,
    evidenceUrl,
    canMessage: kind === "user" && Boolean(candidate.username),
    sourceUpdatedAt: readString(row, ["updated_at", "updatedAt", "source_updated_at", "date"]),
    _matchText: rawMessageText,
  };
}

function buildRelatedQueries(results: PublicEntityResult[], currentQuery: string) {
  const current = normalizeArabic(currentQuery).replace(/^@/, "");
  const candidates = results.flatMap(result => [
    result.username ? `@${result.username}` : null,
    result.title,
  ]).filter((value): value is string => Boolean(value));
  return candidates.filter((value, index) => {
    const normalized = normalizeArabic(value).replace(/^@/, "");
    return normalized !== current && candidates.findIndex(candidate => normalizeArabic(candidate).replace(/^@/, "") === normalized) === index;
  }).slice(0, 8);
}

async function callProvider(query: string, limit: number) {
  const url = new URL(`${ENV.telegramPublicSearchBaseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, {
    headers: { "X-API-Key": ENV.telegramPublicSearchApiKey, Authorization: `Bearer ${ENV.telegramPublicSearchApiKey}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
  const payload = await response.json() as { results?: unknown };
  return Array.isArray(payload.results) ? payload.results.map(asProviderRow).filter((row): row is ProviderRow => Boolean(row)) : [];
}

export async function searchPublicTelegram(query: string): Promise<SearchResponse> {
  const input = query.trim();
  const suggestions = generateSearchVariants(input);
  const empty = { relatedQueries: [], sourceLabel: "وسيط رسائل القنوات العامة" };
  if (isRestrictedInput(input)) return { status: "restricted", message: "لا يدعم الدليل البحث بأرقام الهواتف أو استخدام الأرقام لاستنتاج هوية الأشخاص.", results: [], suggestions: [], ...empty };
  if (!input) return { status: "ok", results: [], suggestions: [], ...empty };
  if (!ENV.telegramPublicSearchBaseUrl || !ENV.telegramPublicSearchApiKey) return { status: "source_not_configured", results: [], suggestions, ...empty };
  const cacheKey = normalizeArabic(input);
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  try {
    const batches: ProviderRow[] = [];
    for (const variant of suggestions) {
      const rows = await callProvider(variant, 20);
      batches.push(...rows);
    }
    const mapped = batches.map(row => mapPublicProviderRow(row, input)).filter((item): item is PublicEntityResult => Boolean(item));
    const results = rankPublicResults(deduplicatePublicResults(mapped), input).slice(0, 20);
    await db.upsertPublicEntities(results.map(result => ({
      sourceId: result.id,
      kind: result.kind,
      title: result.title,
      username: result.username,
      description: result.description,
      photoUrl: result.photoUrl,
      language: result.language,
      statLabel: result.publicStats?.label ?? null,
      statValue: result.publicStats?.value ?? null,
      publicUrl: result.publicUrl,
      canMessage: result.canMessage,
      sourceUpdatedAt: result.sourceUpdatedAt ? new Date(result.sourceUpdatedAt) : null,
    })));
    const answer: SearchResponse = { status: "ok", results, suggestions, relatedQueries: buildRelatedQueries(results, input), sourceLabel: "وسيط رسائل القنوات العامة" };
    queryCache.set(cacheKey, { expiresAt: Date.now() + 60_000, response: answer });
    return answer;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "SOURCE_ERROR";
    console.warn("[Telegram search] provider unavailable", reason);
    return { status: "source_unavailable", message: "تعذر الوصول إلى المصدر المصرح به أو تم احترام حدّ طلباته.", results: [], suggestions, ...empty };
  }
}

export async function refreshPublicEntity(username: string) {
  if (!USERNAME_PATTERN.test(username) || !ENV.telegramPublicSearchBaseUrl || !ENV.telegramPublicSearchApiKey) return 0;
  const rows = await callProvider(username, 5);
  const results = rankPublicResults(deduplicatePublicResults(rows.map(row => mapPublicProviderRow(row, username)).filter((item): item is PublicEntityResult => Boolean(item))), username);
  await db.upsertPublicEntities(results.map(result => ({
    sourceId: result.id,
    kind: result.kind,
    title: result.title,
    username: result.username,
    description: result.description,
    photoUrl: result.photoUrl,
    language: result.language,
    statLabel: result.publicStats?.label ?? null,
    statValue: result.publicStats?.value ?? null,
    publicUrl: result.publicUrl,
    canMessage: result.canMessage,
    sourceUpdatedAt: result.sourceUpdatedAt ? new Date(result.sourceUpdatedAt) : null,
  })));
  return results.length;
}
