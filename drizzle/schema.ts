import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

/** Single private Campus Quest snapshot per owner. Payload is validated at the API boundary. */
export const academicSyncStates = mysqlTable("academic_sync_states", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  revision: int("revision").notNull().default(0),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("academic_sync_states_owner_unique").on(table.ownerId),
]);

/** Private evidence objects for certificates and competitions. Only the owning account may resolve a storage key. */
export const privateAchievementMedia = mysqlTable("private_achievement_media", {
  id: varchar("id", { length: 160 }).primaryKey(),
  ownerId: int("ownerId").notNull(),
  storageKey: varchar("storageKey", { length: 1_000 }).notNull(),
  fileName: varchar("fileName", { length: 300 }).notNull(),
  mimeType: varchar("mimeType", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("private_achievement_media_owner_idx").on(table.ownerId),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AcademicSyncState = typeof academicSyncStates.$inferSelect;
export type PrivateAchievementMedia = typeof privateAchievementMedia.$inferSelect;

// TODO: Add your tables here
