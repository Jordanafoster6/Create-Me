import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base schemas
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const designs = pgTable("designs", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  imageUrl: text("image_url").notNull(),
  prompt: text("prompt"),
  status: text("status").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  designId: integer("design_id").references(() => designs.id),
  printifyId: text("printify_id").notNull(),
  variantId: integer("variant_id").notNull(),
  status: text("status").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertConversationSchema = createInsertSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const insertDesignSchema = createInsertSchema(designs);
export const insertProductSchema = createInsertSchema(products);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type Product = typeof products.$inferSelect;

// API Types
export const ChatMessageSchema = z.object({
  content: z.string(),
  role: z.enum(["user", "assistant"]),
});

export const DesignRequestSchema = z.object({
  prompt: z.string(),
  conversationId: z.number(),
});

export const ProductConfigSchema = z.object({
  designId: z.number(),
  printifyProductId: z.string(),
  variantId: z.number(),
  placementData: z.record(z.any()),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type DesignRequest = z.infer<typeof DesignRequestSchema>;
export type ProductConfig = z.infer<typeof ProductConfigSchema>;

export const DesignAnalysisSchema = z.object({
  imageAnalysis: z.object({
    description: z.string()
  }),
  suggestions: z.record(z.string())
});

export const DesignResponseSchema = z.object({
  type: z.enum(["design", "design_and_products", "chat"]),
  imageUrl: z.string().optional(),
  message: z.string().optional(),
  analysis: z.string().optional(),
  design: z.object({
    imageUrl: z.string(),
    analysis: z.string()
  }).optional(),
  products: z.array(z.any()).optional(),
  status: z.string().optional()
});

export type DesignAnalysis = z.infer<typeof DesignAnalysisSchema>;
export type DesignResponse = z.infer<typeof DesignResponseSchema>;