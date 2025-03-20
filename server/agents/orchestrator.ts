import { ChatMessage, OrchestratorResponse, OrchestratorResponseSchema, PrintifyBlueprint } from "@shared/schema";
import { generateChatResponse } from "../services/openai";
import { ProductResearchAgent } from "./product";
import { DesignAgent } from "./design";
import { ConfigurationAgent } from "./config";
import { logger } from "../utils/logger";

interface ParsedMessage {
  type: "parse";
  productDetails: {
    type?: string;
    color?: string;
    size?: string;
    material?: string;
  };
  designContent: string;
}

/**
 * Orchestrator Agent
 * 
 * Manages the flow of conversation and coordinates between different specialized agents
 * (design, product research, configuration) to handle user requests for product customization.
 * 
 * Key responsibilities:
 * - Parsing user intent
 * - Managing conversation context
 * - Coordinating between specialized agents
 * - Ensuring type-safe responses
 */
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

  /**
   * Processes incoming user messages and orchestrates the appropriate response
   * 
   * @param message The incoming chat message
   * @returns Promise<ChatMessage> A properly formatted and validated response
   * @throws Error if message processing fails
   */
  async processMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      this.messageHistory.push(message);
      logger.info("Processing new message", { role: message.role });

      // Handle different conversation modes
      if (this.context.get("designRefinementMode")) {
        return await this.handleDesignRefinement(message);
      }

      if (this.context.get("productSelectionMode")) {
        return await this.handleProductSelection(message);
      }

      // Initial message parsing
      const parsedMessage = await this.parseUserIntent(message);

      if (parsedMessage) {
        this.context.set("currentProductDetails", parsedMessage.productDetails);
        this.context.set("currentDesignContent", parsedMessage.designContent);

        // Generate initial design
        const designResponse = await this.designAgent.generateDesign(parsedMessage.designContent);

        // Enter design refinement mode
        this.context.set("designRefinementMode", true);
        this.context.set("currentDesign", designResponse);

        const response: OrchestratorResponse = {
          type: "design",
          ...JSON.parse(designResponse),
          message: "I've created an initial design based on your description. How does this look? We can make any adjustments needed."
        };

        // Validate response format
        const validatedResponse = OrchestratorResponseSchema.parse(response);

        return {
          role: "assistant",
          content: JSON.stringify(validatedResponse)
        };
      }

      // Fallback response for unclear intent
      const fallbackResponse: OrchestratorResponse = {
        type: "chat",
        message: "Could you please tell me what kind of product you'd like to customize and what design you'd like on it?"
      };

      return {
        role: "assistant",
        content: JSON.stringify(fallbackResponse)
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Orchestration Error", { error: errorMessage });
      throw new Error(`Orchestration Error: ${errorMessage}`);
    }
  }

  /**
   * Parses user intent to extract product details and design requirements
   * 
   * @param message The user's message to parse
   * @returns Promise<ParsedMessage | null> Parsed intent or null if parsing fails
   */
  private async parseUserIntent(message: ChatMessage): Promise<ParsedMessage | null> {
    try {
      const aiResponse = await generateChatResponse([
        {
          role: "user",
          content: `Parse this into product details and design content. Format response as JSON:
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
        },
        message
      ]);

      const parsed = JSON.parse(aiResponse) as ParsedMessage;
      logger.info("Successfully parsed user intent", {
        productType: parsed.productDetails.type,
        hasDesignContent: Boolean(parsed.designContent)
      });

      return parsed;
    } catch (error) {
      logger.error("Failed to parse user intent", { error });
      return null;
    }
  }

  /**
   * Handles the design refinement phase of the conversation
   * 
   * @param message User's feedback on the current design
   * @returns Promise<ChatMessage> Response with either modified design or product options
   */
  private async handleDesignRefinement(message: ChatMessage): Promise<ChatMessage> {
    try {
      const approvalResponse = await generateChatResponse([
        {
          role: "user",
          content: "Determine if this message approves the design or requests changes. Respond with JSON: { type: 'design_feedback', isApproved: boolean, changes: 'description of changes if any' }"
        },
        message
      ]);

      const feedback = JSON.parse(approvalResponse);
      logger.info("Processing design feedback", { isApproved: feedback.isApproved });

      if (feedback.isApproved) {
        // Move to product selection phase
        this.context.set("designRefinementMode", false);
        this.context.set("designApproved", true);
        this.context.set("productSelectionMode", true);

        const productDetails = this.context.get("currentProductDetails");
        const productResponse = await this.productAgent.handleSearch(productDetails);
        const { products, hasMore } = JSON.parse(productResponse);
        this.context.set("currentProducts", productResponse);

        const response: OrchestratorResponse = {
          type: "design_and_products",
          design: JSON.parse(this.context.get("currentDesign")),
          products,
          hasMore,
          status: "approved",
          message: `Perfect! I've found some products that match your requirements. Take a look at these options and let me know which one you prefer. ${hasMore ? "\n\nIf none of these are quite right, I can show you more options." : ""}`
        };

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      } else {
        // Modify the design based on feedback
        const newDesign = await this.designAgent.modifyDesign(
          this.context.get("currentDesign"),
          feedback.changes
        );

        const designData = JSON.parse(newDesign);

        const response: OrchestratorResponse = {
          type: "design",
          imageUrl: designData.imageUrl,
          originalPrompt: designData.originalPrompt,
          currentPrompt: designData.currentPrompt,
          status: "refining",
          message: "I've updated the design based on your feedback. How does this look now?"
        };

        if (designData.analysis) {
          response.analysis = designData.analysis;
        }

        this.context.set("currentDesign", JSON.stringify(response));

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Design Refinement Error", { error: errorMessage });
      throw new Error(`Design Refinement Error: ${errorMessage}`);
    }
  }

  /**
   * Handles the product selection phase of the conversation
   * Uses array index-based selection for reliable product identification
   * 
   * @param message User's product selection or request for more options
   * @returns Promise<ChatMessage> Response with either more products or final configuration
   */
  private async handleProductSelection(message: ChatMessage): Promise<ChatMessage> {
    try {
      const selectionResponse = await generateChatResponse([
        {
          role: "user",
          content: `Determine if this message selects a specific product. 
          Respond with JSON: { 
            type: 'product_selection', 
            wantsMore: boolean, 
            selectedIndex: number // Index of the selected product (0-based), or -1 if no selection
          }`
        },
        message
      ]);

      const selection = JSON.parse(selectionResponse);
      logger.info("Processing product selection", { selection });

      if (selection.wantsMore) {
        // Handle request for more product options
        const productDetails = this.context.get("currentProductDetails");
        const productResponse = await this.productAgent.handleSearch(productDetails, false);
        const { products, hasMore, totalRemaining } = JSON.parse(productResponse);

        if (products.length === 0) {
          const response: OrchestratorResponse = {
            type: "chat",
            message: "I've shown you all the available products that match your requirements. Would you like to try a different type of product?"
          };

          return {
            role: "assistant",
            content: JSON.stringify(OrchestratorResponseSchema.parse(response))
          };
        }

        const response: OrchestratorResponse = {
          type: "design_and_products",
          design: JSON.parse(this.context.get("currentDesign")),
          products,
          hasMore,
          status: "selecting",
          message: `Here are some more options that match your requirements. ${hasMore ? `\n\nThere are ${totalRemaining} more options available if none of these are quite right.` : ""}`
        };

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      }

      if (selection.selectedIndex >= 0) {
        this.context.set("productSelectionMode", false);

        const productsResponse = JSON.parse(this.context.get("currentProducts"));
        const products = productsResponse.products as PrintifyBlueprint[];

        const selectedProduct = products[selection.selectedIndex];

        if (!selectedProduct) {
          throw new Error(`No product found at index ${selection.selectedIndex}`);
        }

        logger.info("Selected product:", { selectedProduct });

        // Create final response with both approved design and selected product
        const response: OrchestratorResponse = {
          type: "design_and_products",
          design: JSON.parse(this.context.get("currentDesign")),
          products: [selectedProduct],
          status: "approved",
          message: "Great choice! Your product has been configured with the approved design."
        };

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      }

      const response: OrchestratorResponse = {
        type: "chat",
        message: "I'm not sure which product you'd like to select. Could you please specify which one you prefer, or let me know if you'd like to see more options?"
      };

      return {
        role: "assistant",
        content: JSON.stringify(OrchestratorResponseSchema.parse(response))
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Product Selection Error", { error: errorMessage });
      throw new Error(`Product Selection Error: ${errorMessage}`);
    }
  }
}