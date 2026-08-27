import * as db from "./db";
import { refreshPublicEntity } from "./telegramSearch";

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** تحديث محدود ومكرر بأمان للكيانات العامة الموجودة أصلًا في الفهرس. */
export async function refreshPublicIndex(setting: { id: number; maxPerRun: number; lastCursor: number }) {
  const limit = Math.min(Math.max(setting.maxPerRun, 1), 25);
  let items = await db.listPublicEntitiesForRefresh(limit, setting.lastCursor);
  let cursor = setting.lastCursor;
  if (items.length === 0 && setting.lastCursor > 0) { cursor = 0; items = await db.listPublicEntitiesForRefresh(limit, 0); }
  let refreshed = 0;
  for (const item of items) {
    cursor = item.id;
    if (!item.username) continue;
    try { refreshed += await refreshPublicEntity(item.username); } catch { /* الفشل الجزئي لا يعيد معالجة السجل نفسه بلا نهاية */ }
    await pause(450);
  }
  await db.updateRefreshCursor(setting.id, cursor);
  return { ok: true, refreshed, processed: items.length, nextCursor: cursor };
}

/** نقطة دخول للخدمات الخارجية المجدولة؛ تنشئ إعدادًا واحدًا فقط عند التشغيل الأول. */
export async function refreshPublicIndexForExternalScheduler(limit: number) {
  const setting = await db.getOrCreateExternalRefreshSetting(Math.min(Math.max(limit, 1), 25));
  if (!setting.enabled) return { ok: true, skipped: "disabled" as const };
  return refreshPublicIndex(setting);
}
