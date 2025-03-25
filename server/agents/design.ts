/**
 * AI Design Generation and Modification Service
 * Handles creation and refinement of product designs using DALL-E
 * Maintains conversation context for design iterations
 */
import { generateImage, analyzeImage } from "../services/openai";
import { DesignResponse, DesignResponseSchema } from "@shared/schema";
import { logger } from "../utils/logger";

export class DesignAgent {
  // Original user prompt for reference during modifications
  private originalPrompt: string = "";
  // Current working prompt including modifications
  private currentPrompt: string = "";

  /**
   * Generates a new design from a text prompt
   * @param prompt - User's design description
   * @returns JSON string with design data and analysis
   * @throws Error if generation fails validation
   */
  async generateDesign(prompt: string): Promise<string> {
    try {
      logger.info("Initiating design generation", {
        promptLength: prompt.length,
      });

      // Store prompts for future modifications
      this.originalPrompt = prompt;
      this.currentPrompt = prompt;

      // Generate initial image from DALL-E
      const imageUrl = await generateImage(prompt);

      // Attempt image analysis (non-blocking)
      let analysis: string | undefined;
      try {
        analysis = await analyzeImage(imageUrl);
      } catch (error) {
        logger.warn("Image analysis failed, proceeding without", { error });
      }

      // Build validated response
      const response = DesignResponseSchema.parse({
        type: "design",
        imageUrl,
        analysis,
        originalPrompt: this.originalPrompt,
        currentPrompt: this.currentPrompt,
        status: "refining",
      });

      logger.info("Design generation completed successfully");
      return JSON.stringify(response);
    } catch (error) {
      this.handleError(error, "Generation", prompt.length);
    }
  }

  /**
   * Modifies existing design based on user feedback
   * @param previousDesign - JSON string of previous design
   * @param modifications - User's modification instructions
   * @returns Updated design JSON with new image and context
   */
  async modifyDesign(
    previousDesign: string,
    modifications: string,
  ): Promise<string> {
    try {
      logger.info("Starting design modification", { modifications });

      // Parse and validate previous design state
      const prevData = DesignResponseSchema.parse(JSON.parse(previousDesign));

      // Build updated prompt combining history and new changes
      this.currentPrompt = `Original: ${prevData.currentPrompt}. Changes: ${modifications}`;

      // Generate updated image
      const newImageUrl = await generateImage(this.currentPrompt);

      // Attempt updated analysis
      let analysis: string | undefined;
      try {
        analysis = await analyzeImage(newImageUrl);
      } catch (error) {
        logger.warn("Modified image analysis failed", { error });
      }

      // Build validated response
      const response = DesignResponseSchema.parse({
        type: "design",
        imageUrl: newImageUrl,
        analysis,
        originalPrompt: prevData.originalPrompt,
        currentPrompt: this.currentPrompt,
        status: "refining",
      });

      logger.info("Design modification successful");
      return JSON.stringify(response);
    } catch (error) {
      this.handleError(error, "Modification", modifications.length);
    }
  }

  /** Unified error handling for all operations */
  private handleError(
    error: unknown,
    operation: string,
    inputLength: number,
  ): never {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Design ${operation} Error`, { error: message, inputLength });
    throw new Error(`Design ${operation} Failed: ${message}`);
  }
}
