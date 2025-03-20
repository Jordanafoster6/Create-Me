import { ChatMessage } from "@shared/schema";
import { generateChatResponse } from "../services/openai";
import { ProductResearchAgent } from "./product";
import { DesignAgent } from "./design";
import { ConfigurationAgent } from "./config";
import { logger } from "../utils/logger";

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
  private messageHistory: ChatMessage[];

  constructor() {
    this.productAgent = new ProductResearchAgent();
    this.designAgent = new DesignAgent();
    this.configAgent = new ConfigurationAgent();
    this.context = new Map();
    this.messageHistory = [];
  }

  async processMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      // Add message to history
      this.messageHistory.push(message);
      logger.info("Processing new message", { role: message.role });

      // If we're in a design refinement loop, handle that separately
      if (this.context.get("designRefinementMode")) {
        logger.info("Handling design refinement");
        return await this.handleDesignRefinement(message);
      }

      // If we're in product selection mode, handle that separately
      if (this.context.get("productSelectionMode")) {
        logger.info("Handling product selection");
        return await this.handleProductSelection(message);
      }

      // Get initial parsing of user intent from OpenAI
      const aiResponse = await generateChatResponse([
        {
          role: "system",
          content: "You are a product customization assistant. Parse user input for product details and design requirements."
        },
        ...this.messageHistory
      ]);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
        if (parsedResponse.type === "parse") {
          // Store the parsed details in context
          this.context.set("currentProductDetails", parsedResponse.productDetails);
          this.context.set("currentDesignContent", parsedResponse.designContent);

          // First focus on getting the design right
          const designResponse = await this.designAgent.generateDesign(parsedResponse.designContent);

          // Enter design refinement mode
          this.context.set("designRefinementMode", true);
          this.context.set("currentDesign", designResponse);

          return {
            role: "assistant",
            content: JSON.stringify({
              type: "design",
              ...JSON.parse(designResponse),
              message: "I've created an initial design based on your description. Let's focus on getting the design just right first - how does this look to you? We can make any adjustments needed."
            })
          };
        }
      } catch (error) {
        logger.error('Failed to parse AI response:', error);
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
      logger.error('Orchestration Error:', error);
      throw new Error(`Orchestration Error: ${error?.message || 'Unknown error'}`);
    }
  }

  private async handleDesignRefinement(message: ChatMessage): Promise<ChatMessage> {
    try {
      // Analyze if the user is approving or requesting changes
      const approvalResponse = await generateChatResponse([{
        role: "user",
        content: `Determine if the user is approving the design or requesting changes. Consider the context of the current design when analyzing modifications. Respond with JSON:
        {
          "type": "design_feedback",
          "isApproved": boolean,
          "changes": "description of requested changes if any"
        }`
      }, message]);

      const parsedResponse = JSON.parse(approvalResponse);

      if (parsedResponse.isApproved) {
        // Design is approved, now we can search for matching products
        this.context.set("designRefinementMode", false);
        this.context.set("designApproved", true);
        this.context.set("productSelectionMode", true);

        // Get the stored product details and search for matching products
        const productDetails = this.context.get("currentProductDetails");
        const productResponse = await this.productAgent.handleSearch(productDetails);
        const { products, hasMore } = JSON.parse(productResponse);

        // Create a combined response with both the final design and product options
        return {
          role: "assistant",
          content: JSON.stringify({
            type: "design_and_products",
            design: JSON.parse(this.context.get("currentDesign")),
            products: products,
            message: `Perfect! Now that we have your design finalized, let's choose the right product for it. I've found some products that match your requirements. Please take a look at the options below and let me know which one you'd prefer. You can refer to them by their name or number in the list.${hasMore ? "\n\nIf you don't see what you're looking for, just let me know and I can show you more options." : ""}`
          })
        };
      } else {
        // Generate new design based on requested changes
        const newDesign = await this.designAgent.modifyDesign(
          this.context.get("currentDesign"),
          parsedResponse.changes
        );

        // Update the current design in context
        this.context.set("currentDesign", newDesign);

        return {
          role: "assistant",
          content: JSON.stringify({
            type: "design",
            ...JSON.parse(newDesign),
            message: "I've updated the design based on your feedback. How does this look now? We can make more adjustments if needed."
          })
        };
      }
    } catch (error: any) {
      console.error('Design Refinement Error:', error);
      throw new Error(`Design Refinement Error: ${error?.message || 'Unknown error'}`);
    }
  }

  private async handleProductSelection(message: ChatMessage): Promise<ChatMessage> {
    try {
      // First, check if the user wants to see more products
      const moreProductsResponse = await generateChatResponse([{
        role: "user",
        content: `Determine if the user is requesting to see more product options. Respond with JSON:
        {
          "type": "product_selection",
          "wantsMore": boolean,
          "selectedProduct": number or null
        }`
      }, message]);

      const parsedResponse = JSON.parse(moreProductsResponse);

      if (parsedResponse.wantsMore) {
        // User wants to see more products
        const productDetails = this.context.get("currentProductDetails");
        const productResponse = await this.productAgent.handleSearch(productDetails, false);
        const { products, hasMore, totalRemaining } = JSON.parse(productResponse);

        if (products.length === 0) {
          return {
            role: "assistant",
            content: JSON.stringify({
              type: "chat",
              message: "I've shown you all the available products that match your requirements. Would you like to try a different type of product or modify your search?"
            })
          };
        }

        return {
          role: "assistant",
          content: JSON.stringify({
            type: "design_and_products",
            design: JSON.parse(this.context.get("currentDesign")),
            products: products,
            message: `Here are some more options that match your requirements. ${hasMore ? `\n\nThere are ${totalRemaining} more options available if none of these are quite right.` : "\n\nThese are the last available options that match your requirements."}`
          })
        };
      } else if (parsedResponse.selectedProduct !== null) {
        // User has selected a product, move to configuration
        this.context.set("productSelectionMode", false);
        // TODO: Implement product configuration flow
        return {
          role: "assistant",
          content: JSON.stringify({
            type: "chat",
            message: "Great choice! Let's configure your selected product with the design we created."
          })
        };
      }

      // If we're here, the user's response wasn't clear
      return {
        role: "assistant",
        content: JSON.stringify({
          type: "chat",
          message: "I'm not sure if you'd like to see more options or if you've chosen a product. Could you please clarify if you'd like to see more products, or let me know which product you'd like to use?"
        })
      };
    } catch (error: any) {
      console.error('Product Selection Error:', error);
      throw new Error(`Product Selection Error: ${error?.message || 'Unknown error'}`);
    }
  }

  setContext(key: string, value: any) {
    this.context.set(key, value);
  }

  getContext(key: string) {
    return this.context.get(key);
  }
}