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
   * @param message The incoming chat message
   * @returns Promise<ChatMessage> A properly formatted and validated response
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

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      }

      // Fallback response for unclear intent
      const response: OrchestratorResponse = {
        type: "chat",
        message: "Could you please tell me what kind of product you'd like to customize and what design you'd like on it?"
      };

      return {
        role: "assistant",
        content: JSON.stringify(response)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Orchestration Error", { error: errorMessage });
      throw new Error(`Orchestration Error: ${errorMessage}`);
    }
  }

  /**
   * Handles the design refinement phase of the conversation
   * @param message User's feedback on the current design
   * @returns Promise<ChatMessage> Response with either modified design or transition to product selection
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

        // Store the approved design
        const currentDesign = JSON.parse(this.context.get("currentDesign"));
        currentDesign.status = "approved";
        this.context.set("currentDesign", JSON.stringify(currentDesign));

        // Transition to product selection
        return await this.initiateProductSelection();
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
   * Initiates the product selection phase after design approval
   * @returns Promise<ChatMessage> Response with either product options or request for more details
   */
  private async initiateProductSelection(): Promise<ChatMessage> {
    try {
      const productDetails = this.context.get("currentProductDetails");

      // Check if we have enough product details
      if (!this.hasEnoughProductDetails(productDetails)) {
        const response: OrchestratorResponse = {
          type: "chat",
          message: "Great! I've saved your approved design. To help you find the perfect product, could you tell me what type of product you're looking for? For example, t-shirt, hoodie, mug, etc. You can also specify color or material preferences."
        };

        return {
          role: "assistant",
          content: JSON.stringify(OrchestratorResponseSchema.parse(response))
        };
      }

      // Get matching products
      const productResponse = await this.productAgent.handleSearch(productDetails);
      const { products, hasMore, totalRemaining } = JSON.parse(productResponse);

      const response: OrchestratorResponse = {
        type: "product_selection",
        products,
        hasMore,
        totalRemaining,
        message: `Perfect! I've found some products that match your requirements. Take a look at these options and let me know which one you prefer. ${hasMore ? `\n\nThere are ${totalRemaining} more options available if none of these are quite right.` : ""}`
      };

      this.context.set("productSelectionMode", true);

      return {
        role: "assistant",
        content: JSON.stringify(OrchestratorResponseSchema.parse(response))
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Product Selection Initiation Error", { error: errorMessage });
      throw new Error(`Product Selection Initiation Error: ${errorMessage}`);
    }
  }

  /**
   * Validates if we have enough product details to start product search
   * @param details Product details from context
   * @returns boolean indicating if we have sufficient details
   */
  private hasEnoughProductDetails(details: any): boolean {
    if (!details || !details.type) return false;

    // Require at least one additional detail besides type
    return Boolean(details.color || details.size || details.material);
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
          type: "product_selection",
          products,
          hasMore,
          totalRemaining,
          status: "selecting", 
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