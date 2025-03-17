import { ChatMessage } from "@shared/schema";
import { generateChatResponse } from "../services/openai";
import { ProductResearchAgent } from "./product";
import { DesignAgent } from "./design";
import { ConfigurationAgent } from "./config";

interface ParsedMessage {
  productDetails: {
    type?: string;
    color?: string;
    size?: string;
    material?: string;
  };
  designContent: string;
}

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
      // If we're in a design refinement loop, handle that separately
      if (this.context.get("designRefinementMode")) {
        return await this.handleDesignRefinement(message);
      }

      // Get initial parsing of user intent from OpenAI
      const aiResponse = await generateChatResponse([{
        role: "system",
        content: `Parse this message into product details and design content. Respond with JSON:
        {
          "type": "parse",
          "productDetails": {
            "type": "product type if mentioned",
            "color": "color if mentioned",
            "size": "size if mentioned",
            "material": "material if mentioned"
          },
          "designContent": "description of the design content only"
        }`
      }, message]);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
        if (parsedResponse.type === "parse") {
          // Store the parsed details in context
          const currentDetails = this.context.get("currentProductDetails") || {};
          this.context.set("currentProductDetails", {
            ...currentDetails,
            ...parsedResponse.productDetails
          });
          this.context.set("currentDesignContent", parsedResponse.designContent);

          // Silently update blueprint matches in context
          if (parsedResponse.productDetails.type) {
            const blueprintResponse = await this.productAgent.findMatchingBlueprints(
              this.context.get("currentProductDetails")
            );
            this.context.set("matchingBlueprints", JSON.parse(blueprintResponse).blueprints);
          }

          // Focus on design generation first
          const designResponse = await this.designAgent.generateDesign(parsedResponse.designContent);

          // Set design refinement mode
          this.context.set("designRefinementMode", true);
          this.context.set("currentDesign", designResponse);

          return {
            role: "assistant",
            content: JSON.stringify({
              type: "design",
              ...JSON.parse(designResponse),
              message: "I've created an initial design based on your description. Let's focus on getting the design just right - how does this look to you? We can make any adjustments needed."
            })
          };
        }
      } catch (error) {
        console.error('Failed to parse AI response:', error);
      }

      // Fallback response if parsing fails
      return {
        role: "assistant",
        content: JSON.stringify({
          type: "chat",
          message: "Could you please tell me what kind of product you'd like to customize and what design you'd like on it?"
        })
      };
    } catch (error: any) {
      console.error('Orchestration Error:', error);
      throw new Error(`Orchestration Error: ${error?.message || 'Unknown error'}`);
    }
  }

  private async handleDesignRefinement(message: ChatMessage): Promise<ChatMessage> {
    try {
      // Analyze if the user is approving or requesting changes
      const approvalResponse = await generateChatResponse([{
        role: "system",
        content: `Determine if the user is approving the design or requesting changes. Respond with JSON:
        {
          "type": "design_feedback",
          "isApproved": boolean,
          "changes": "description of requested changes if any"
        }`
      }, message]);

      const parsedResponse = JSON.parse(approvalResponse);

      if (parsedResponse.isApproved) {
        // If design is approved, now we can show the matching blueprints
        const matchingBlueprints = this.context.get("matchingBlueprints");
        this.context.set("designRefinementMode", false);

        return {
          role: "assistant",
          content: JSON.stringify({
            type: "product_options",
            blueprints: matchingBlueprints,
            design: JSON.parse(this.context.get("currentDesign")),
            message: "Great! Now that we have your design finalized, I've found some products that match your requirements. Which one would you like to use?"
          })
        };
      } else {
        // Generate new design based on requested changes
        const newDesign = await this.designAgent.modifyDesign(
          this.context.get("currentDesign"),
          parsedResponse.changes
        );

        return {
          role: "assistant",
          content: JSON.stringify({
            type: "design",
            ...JSON.parse(newDesign),
            message: "I've updated the design based on your feedback. How does this look now?"
          })
        };
      }
    } catch (error: any) {
      console.error('Design Refinement Error:', error);
      throw new Error(`Design Refinement Error: ${error?.message || 'Unknown error'}`);
    }
  }

  setContext(key: string, value: any) {
    this.context.set(key, value);
  }

  getContext(key: string) {
    return this.context.get(key);
  }
}