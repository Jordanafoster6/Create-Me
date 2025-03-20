import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base schemas and tables remain unchanged
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

// Database Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type Product = typeof products.$inferSelect;

// API Request/Response Types
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

// Shared Types
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type DesignRequest = z.infer<typeof DesignRequestSchema>;
export type ProductConfig = z.infer<typeof ProductConfigSchema>;

// Design Response Types
export const DesignAnalysisSchema = z.object({
  imageAnalysis: z.object({
    description: z.string(),
  }),
  suggestions: z.record(z.string()),
});

export const DesignResponseSchema = z.object({
  type: z.literal("design"),
  imageUrl: z.string(),
  analysis: z.string(),
  originalPrompt: z.string(),
  currentPrompt: z.string(),
  status: z.string(),
});

// Product Response Types
export const PrintifyVariantSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  is_enabled: z.boolean(),
  options: z.record(z.string()).optional(),
});

export const PrintifyBlueprintSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  images: z.array(z.string()),
  variants: z.array(PrintifyVariantSchema).optional(),
});

export const ProductSearchResponseSchema = z.object({
  products: z.array(PrintifyBlueprintSchema),
  hasMore: z.boolean(),
  totalRemaining: z.number(),
  status: z.string(),
});

// Export Types
export type DesignAnalysis = z.infer<typeof DesignAnalysisSchema>;
export type DesignResponse = z.infer<typeof DesignResponseSchema>;
export type PrintifyVariant = z.infer<typeof PrintifyVariantSchema>;
export type PrintifyBlueprint = z.infer<typeof PrintifyBlueprintSchema>;
export type ProductSearchResponse = z.infer<typeof ProductSearchResponseSchema>;

// Add these new type definitions after the existing ones
export const OrchestratorResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat"),
    message: z.string()
  }),
  z.object({
    type: z.literal("design"),
    imageUrl: z.string(),
    analysis: z.string(),
    originalPrompt: z.string(),
    currentPrompt: z.string(),
    message: z.string().optional(),
    status: z.string()
  }),
  z.object({
    type: z.literal("design_and_products"),
    design: DesignResponseSchema,
    products: z.array(PrintifyBlueprintSchema),
    message: z.string(),
    hasMore: z.boolean().optional()
  })
]);

export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;