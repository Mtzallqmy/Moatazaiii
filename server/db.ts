import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPublicEntity, InsertUser, publicEntities, publicIndexRefreshSettings, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertPublicEntities(entries: InsertPublicEntity[]) {
  const db = await getDb();
  if (!db || entries.length === 0) return;
  for (const entry of entries) {
    await db.insert(publicEntities).values(entry).onDuplicateKeyUpdate({
      set: {
        kind: entry.kind,
        title: entry.title,
        username: entry.username ?? null,
        description: entry.description ?? null,
        photoUrl: entry.photoUrl ?? null,
        language: entry.language ?? null,
        statLabel: entry.statLabel ?? null,
        statValue: entry.statValue ?? null,
        publicUrl: entry.publicUrl ?? null,
        canMessage: entry.canMessage ?? false,
        sourceUpdatedAt: entry.sourceUpdatedAt ?? null,
        refreshedAt: new Date(),
      },
    });
  }
}

export async function listPublicEntitiesForRefresh(limit: number, offset: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publicEntities).orderBy(asc(publicEntities.id)).limit(limit).offset(offset);
}

export async function getRefreshSettingByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(publicIndexRefreshSettings).where(eq(publicIndexRefreshSettings.scheduleCronTaskUid, taskUid)).limit(1))[0];
}

export async function getOrCreateExternalRefreshSetting(maxPerRun: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is required for scheduled refresh");
  const existing = (await db.select().from(publicIndexRefreshSettings).limit(1))[0];
  if (existing) return existing;
  await db.insert(publicIndexRefreshSettings).values({ enabled: true, maxPerRun });
  const created = (await db.select().from(publicIndexRefreshSettings).limit(1))[0];
  if (!created) throw new Error("Unable to create scheduled refresh settings");
  return created;
}

export async function updateRefreshCursor(id: number, lastCursor: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(publicIndexRefreshSettings).set({ lastCursor, lastRanAt: new Date() }).where(eq(publicIndexRefreshSettings.id, id));
}
