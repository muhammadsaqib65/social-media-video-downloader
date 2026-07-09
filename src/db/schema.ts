import { pgTable, text, timestamp, serial, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 20 }).notNull(), // tiktok, instagram, youtube
  originalUrl: text("original_url").notNull(),
  title: text("title"),
  thumbnail: text("thumbnail"),
  author: varchar("author", { length: 255 }),
  quality: varchar("quality", { length: 20 }),
  fileSize: varchar("file_size", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 20 }).default("success"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  totalDownloads: integer("total_downloads").default(0),
  tiktokDownloads: integer("tiktok_downloads").default(0),
  instagramDownloads: integer("instagram_downloads").default(0),
  youtubeDownloads: integer("youtube_downloads").default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).unique().notNull(),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});
