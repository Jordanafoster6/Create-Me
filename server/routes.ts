import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OrchestratorAgent } from "./agents/orchestrator";
import { ChatMessageSchema, DesignRequestSchema } from "@shared/schema";
import { z } from "zod";

const orchestrator = new OrchestratorAgent();

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const message = ChatMessageSchema.parse(req.body);
      const response = await orchestrator.processMessage(message);
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Invalid request' });
    }
  });

  // Design endpoints
  app.post("/api/designs", async (req, res) => {
    try {
      const { prompt, conversationId } = DesignRequestSchema.parse(req.body);
      const design = await orchestrator.processMessage({
        role: "user",
        content: JSON.stringify({ type: "design_generation", prompt, conversationId })
      });
      res.json(design);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Invalid request' });
    }
  });

  // Product endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const query = z.string().optional().parse(req.query.q);
      const products = await orchestrator.processMessage({
        role: "user",
        content: JSON.stringify({ type: "product_search", query: query || "" })
      });
      res.json(products);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Invalid request' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}