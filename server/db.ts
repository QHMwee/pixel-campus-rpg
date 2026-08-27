import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { academicSyncStates, InsertUser, privateAchievementMedia, users } from "../drizzle/schema";
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

export type PrivateAcademicSyncState = {
  revision: number;
  payload: string;
  updatedAt: Date;
};

export async function getPrivateAcademicSyncState(ownerId: number): Promise<PrivateAcademicSyncState | null> {
  const db = await getDb();
  if (!db) throw new Error("私人同步資料庫暫時無法使用。");
  const rows = await db.select({ revision: academicSyncStates.revision, payload: academicSyncStates.payload, updatedAt: academicSyncStates.updatedAt })
    .from(academicSyncStates)
    .where(eq(academicSyncStates.ownerId, ownerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createPrivateAcademicSyncState(ownerId: number, payload: string): Promise<PrivateAcademicSyncState | null> {
  const db = await getDb();
  if (!db) throw new Error("私人同步資料庫暫時無法使用。");
  try {
    await db.insert(academicSyncStates).values({ ownerId, revision: 1, payload });
    return await getPrivateAcademicSyncState(ownerId);
  } catch (error) {
    const duplicate = error instanceof Error && /duplicate|unique/i.test(error.message);
    if (duplicate) return null;
    throw error;
  }
}

export async function updatePrivateAcademicSyncState(ownerId: number, baseRevision: number, payload: string): Promise<PrivateAcademicSyncState | null> {
  const db = await getDb();
  if (!db) throw new Error("私人同步資料庫暫時無法使用。");
  const result = await db.update(academicSyncStates)
    .set({ payload, revision: baseRevision + 1, updatedAt: new Date() })
    .where(and(eq(academicSyncStates.ownerId, ownerId), eq(academicSyncStates.revision, baseRevision)));
  if (result[0].affectedRows !== 1) return null;
  return await getPrivateAcademicSyncState(ownerId);
}

export async function createPrivateAchievementMedia(input: { id: string; ownerId: number; storageKey: string; fileName: string; mimeType: string }) {
  const db = await getDb();
  if (!db) throw new Error("私人附件資料庫暫時無法使用。");
  await db.insert(privateAchievementMedia).values(input);
  return input;
}

export async function getPrivateAchievementMedia(ownerId: number, id: string) {
  const db = await getDb();
  if (!db) throw new Error("私人附件資料庫暫時無法使用。");
  const rows = await db.select().from(privateAchievementMedia)
    .where(and(eq(privateAchievementMedia.ownerId, ownerId), eq(privateAchievementMedia.id, id))).limit(1);
  return rows[0] ?? null;
}

// TODO: add feature queries here as your app grows.
