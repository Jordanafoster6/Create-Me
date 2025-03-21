import { ChatMessage, OrchestratorResponse, OrchestratorResponseSchema } from "@shared/schema";
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

        // Use product details from context and the product agent
        // to find products matching what the user is looking for
        const productDetails = this.context.get("currentProductDetails");
        const productResponse = await this.productAgent.handleSearch(productDetails);
        const { products, hasMore } = JSON.parse(productResponse);

        const response: OrchestratorResponse = {
          type: "design_and_products",
          design: JSON.parse(this.context.get("currentDesign")),
          products,
          hasMore,
          status: "approved", // Add status to indicate this is an approved design
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

        // Even if analysis failed, we can still return the new design
        const designData = JSON.parse(newDesign);

        const response: OrchestratorResponse = {
          type: "design",
          imageUrl: designData.imageUrl,
          originalPrompt: designData.originalPrompt,
          currentPrompt: designData.currentPrompt,
          status: "refining", // Add status to indicate this is still being refined
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
   * 
   * @param message User's product selection or request for more options
   * @returns Promise<ChatMessage> Response with either more products or confirmation
   */
  private async handleProductSelection(message: ChatMessage): Promise<ChatMessage> {
    try {
      const selectionResponse = await generateChatResponse([
        {
          role: "user",
          content: "Determine if this message requests more product options. Respond with JSON: { type: 'product_selection', wantsMore: boolean, selectedProduct: number or null }"
        },
        message
      ]);

      const selection = JSON.parse(selectionResponse);
      logger.info("Processing product selection", { wantsMore: selection.wantsMore });

      if (selection.wantsMore) {
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
          status: "selecting", // Add required status
          message: `Here are some more options that match your requirements. ${hasMore ? `\n\nThere are ${totalRemaining} more options available if none of these are quite right.` : ""}`
        };

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      }

      if (selection.selectedProduct !== null) {
        this.context.set("productSelectionMode", false);
        this.context.set("selectedProduct", selection.selectedProduct);

        const response: OrchestratorResponse = {
          type: "chat",
          message: "Great choice! Let's configure your selected product with the design we created."
        };

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      }

      const response: OrchestratorResponse = {
        type: "chat",
        message: "I'm not sure if you'd like to see more options or if you've chosen a product. Could you please clarify?"
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

  /**
   * Retrieves the current product creation status including approved design and selected product
   * @returns Promise<ProductStatusResponse> Current status of the product creation process
   */
  async getProductStatus(): Promise<ProductStatusResponse> {
    try {
      const approvedDesign = this.context.get("designApproved") 
        ? JSON.parse(this.context.get("currentDesign"))
        : null;

      const selectedProduct = this.context.get("selectedProduct");

      // Only return approved design URL if design is approved
      const status: ProductStatusResponse = {
        approvedImageUrl: approvedDesign?.status === "approved" ? approvedDesign.imageUrl : undefined,
        selectedProduct: selectedProduct ? {
          productImg: selectedProduct.images[0],
          productName: selectedProduct.title,
          productDescription: selectedProduct.description || ""
        } : undefined,
        productConfigObject: this.context.get("productConfig")
      };

      logger.info("Retrieved product status", { 
        hasApprovedImage: !!status.approvedImageUrl,
        hasSelectedProduct: !!status.selectedProduct
      });

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Product Status Error", { error: errorMessage });
      throw new Error(`Product Status Error: ${errorMessage}`);
    }
  }
}

interface ProductStatusResponse {
  approvedImageUrl?: string;
  selectedProduct?: {
    productImg: string;
    productName: string;
    productDescription: string;
  };
  productConfigObject?: any;
}