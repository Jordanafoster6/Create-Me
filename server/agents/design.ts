import { generateImage, analyzeImage } from "../services/openai";
import { DesignResponse, DesignResponseSchema } from "@shared/schema";
import { logger } from "../utils/logger";

/**
 * Design Agent handles the generation and modification of product designs
 * using AI image generation capabilities
 */
export class DesignAgent {
  private originalPrompt: string = "";
  private currentPrompt: string = "";

  /**
   * Generates a new design based on user prompt
   * @param prompt User's description of desired design
   * @returns Promise<string> JSON string containing design details
   * @throws Error if design generation fails
   */
  async generateDesign(prompt: string): Promise<string> {
    try {
      logger.info("Starting design generation", { promptLength: prompt.length });

      // Store the original prompt
      this.originalPrompt = prompt;
      this.currentPrompt = prompt;

      // Generate image using DALL-E
      const imageUrl = await generateImage(prompt);

      // Try to get analysis, but don't fail if it's not available
      let analysis: string | undefined;
      try {
        analysis = await analyzeImage(imageUrl);
      } catch (error) {
        logger.warn("Failed to analyze image, continuing without analysis", { error });
      }

      const response: DesignResponse = {
        type: "design",
        imageUrl,
        analysis,
        originalPrompt: this.originalPrompt,
        currentPrompt: this.currentPrompt,
        status: "success"
      };

      // Validate response format
      const validatedResponse = DesignResponseSchema.parse(response);

      logger.info("Successfully generated design");
      return JSON.stringify(validatedResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Design Generation Error", { 
        error: errorMessage,
        promptLength: prompt.length
      });
      throw new Error(`Design Generation Error: ${errorMessage}`);
    }
  }

  /**
   * Modifies an existing design based on user feedback
   * @param previousDesign JSON string containing previous design details
   * @param modifications User's requested modifications
   * @returns Promise<string> JSON string containing modified design details
   * @throws Error if design modification fails
   */
  async modifyDesign(previousDesign: string, modifications: string): Promise<string> {
    try {
      logger.info("Starting design modification", { 
        modificationsLength: modifications.length 
      });

      // Parse the previous design to get the context
      const prevDesignData = DesignResponseSchema.parse(JSON.parse(previousDesign));

      // Combine the original context with modifications
      this.currentPrompt = `Original design was: ${prevDesignData.currentPrompt}. 
Modifications requested: ${modifications}
Keep the core elements while applying these modifications.`;

      // Generate new image with combined context
      const newImageUrl = await generateImage(this.currentPrompt);

      // Try to get analysis, but don't fail if it's not available
      let analysis: string | undefined;
      try {
        analysis = await analyzeImage(newImageUrl);
      } catch (error) {
        logger.warn("Failed to analyze modified image, continuing without analysis", { error });
      }

      const response: DesignResponse = {
        type: "design",
        imageUrl: newImageUrl,
        analysis,
        originalPrompt: prevDesignData.originalPrompt,
        currentPrompt: this.currentPrompt,
        status: "success"
      };

      // Validate response format
      const validatedResponse = DesignResponseSchema.parse(response);

      logger.info("Successfully modified design");
      return JSON.stringify(validatedResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Design Modification Error", { 
        error: errorMessage,
        modificationsLength: modifications.length
      });
      throw new Error(`Design Modification Error: ${errorMessage}`);
    }
  }
}