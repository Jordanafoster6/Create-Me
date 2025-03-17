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
      // Get response from OpenAI
      const aiResponse = await generateChatResponse([message]);
      console.log('AI Response:', aiResponse);

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (error) {
        console.error('Failed to parse AI response:', error);
        return {
          role: "assistant",
          content: JSON.stringify({
            type: "chat",
            message: "I'm having trouble understanding that. Could you please rephrase?"
          })
        };
      }

      // Handle different actions based on intent
      let response: string;
      switch (parsedResponse.type) {
        case "design_generation":
          response = await this.designAgent.generateDesign(parsedResponse.prompt || "");
          break;
        case "product_search":
          response = await this.productAgent.handleSearch(parsedResponse.query || "");
          break;
        case "design_modification":
          response = await this.designAgent.modifyDesign(
            parsedResponse.designId || "",
            parsedResponse.modifications || ""
          );
          break;
        case "product_configuration":
          response = await this.configAgent.configureProduct(
            parsedResponse.productId || "",
            parsedResponse.designId || ""
          );
          break;
        case "chat":
          response = JSON.stringify({
            type: "chat",
            message: parsedResponse.message || "I understand. How can I help you customize your product?"
          });
          break;
        default:
          response = JSON.stringify({
            type: "chat",
            message: "I'm not sure how to help with that. Could you try rephrasing your request?"
          });
      }

      return {
        role: "assistant",
        content: response
      };
    } catch (error: any) {
      console.error('Orchestration Error:', error);
      throw new Error(`Orchestration Error: ${error?.message || 'Unknown error'}`);
    }
  }

  setContext(key: string, value: any) {
    this.context.set(key, value);
  }

  getContext(key: string) {
    return this.context.get(key);
  }
}