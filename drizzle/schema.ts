import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** فهرس أقلّي للبيانات العامة التي يعيدها المصدر؛ لا رسائل ولا جهات اتصال ولا أرقام هواتف. */
export const publicEntities = mysqlTable("public_entities", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: varchar("sourceId", { length: 190 }).notNull().unique(),
  kind: mysqlEnum("kind", ["channel", "group", "user"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  username: varchar("username", { length: 64 }),
  description: text("description"),
  photoUrl: text("photoUrl"),
  language: varchar("language", { length: 24 }),
  statLabel: varchar("statLabel", { length: 64 }),
  statValue: int("statValue"),
  publicUrl: varchar("publicUrl", { length: 512 }),
  canMessage: boolean("canMessage").default(false).notNull(),
  sourceUpdatedAt: timestamp("sourceUpdatedAt"),
  refreshedAt: timestamp("refreshedAt").defaultNow().notNull(),
}, table => [index("public_entities_username_idx").on(table.username), index("public_entities_title_idx").on(table.title)]);

/** يحفظ معرّف مهمة التحديث؛ لا تتم المطابقة أبدًا باسم المهمة أو بحمولة الطلب. */
export const publicIndexRefreshSettings = mysqlTable("public_index_refresh_settings", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }).unique(),
  enabled: boolean("enabled").default(true).notNull(),
  maxPerRun: int("maxPerRun").default(20).notNull(),
  lastCursor: int("lastCursor").default(0).notNull(),
  lastRanAt: timestamp("lastRanAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("public_index_refresh_task_uid_idx").on(table.scheduleCronTaskUid)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PublicEntity = typeof publicEntities.$inferSelect;
export type InsertPublicEntity = typeof publicEntities.$inferInsert;
