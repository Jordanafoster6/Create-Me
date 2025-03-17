import { ChatMessage } from "@shared/schema";
import { generateChatResponse } from "../services/openai";
import { ProductResearchAgent } from "./product";
import { DesignAgent } from "./design";
import { ConfigurationAgent } from "./config";

export class OrchestratorAgent {
  private productAgent: ProductResearchAgent;
  private designAgent: DesignAgent;
  private configAgent: ConfigurationAgent;
  private context: Map<string, any>;

  constructor() {
    this.productAgent = new ProductResearchAgent();
    this.designAgent = new DesignAgent();
    this.configAgent = new ConfigurationAgent();
    this.context = new Map();
  }

  async processMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      // Analyze user intent
      const intent = await this.analyzeIntent(message);

      let response: string;
      switch (intent.action) {
        case "product_search":
          response = await this.productAgent.handleSearch(intent.query || "");
          break;
        case "design_generation":
          response = await this.designAgent.generateDesign(intent.prompt || "");
          break;
        case "design_modification":
          response = await this.designAgent.modifyDesign(intent.designId || "", intent.modifications || "");
          break;
        case "product_configuration":
          response = await this.configAgent.configureProduct(intent.productId || "", intent.designId || "");
          break;
        default:
          response = await generateChatResponse([
            {
              role: "user",
              content: message.content
            }
          ]);
      }

      return {
        role: "assistant",
        content: response
      };
    } catch (error: any) {
      throw new Error(`Orchestration Error: ${error?.message || 'Unknown error'}`);
    }
  }

  private async analyzeIntent(message: ChatMessage): Promise<{
    action: string;
    query?: string;
    prompt?: string;
    designId?: string;
    modifications?: string;
    productId?: string;
  }> {
    const intentResponse = await generateChatResponse([
      {
        role: "user",
        content: message.content
      }
    ]);

    try {
      return JSON.parse(intentResponse);
    } catch (error) {
      return { action: "chat" };
    }
  }

  setContext(key: string, value: any) {
    this.context.set(key, value);
  }

  getContext(key: string) {
    return this.context.get(key);
  }
}