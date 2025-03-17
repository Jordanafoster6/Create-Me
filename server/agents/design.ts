import { generateImage, analyzeImage } from "../services/openai";
import { DesignAnalysis } from "@shared/schema";

export class DesignAgent {
  async generateDesign(prompt: string): Promise<string> {
    try {
      // Generate image using DALL-E
      const imageUrl = await generateImage(prompt);

      // Analyze the generated image
      const analysis = await analyzeImage(imageUrl);

      return JSON.stringify({
        type: "design",
        imageUrl,
        analysis,
        message: "I've created a design based on your description. How does this look? We can make adjustments if needed.",
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Design Generation Error: ${errorMessage}`);
    }
  }

  async modifyDesign(designId: string, modifications: string): Promise<string> {
    try {
      // Apply modifications using DALL-E
      const newImageUrl = await generateImage(modifications);

      // Analyze the modified image
      const analysis = await analyzeImage(newImageUrl);

      return JSON.stringify({
        type: "design",
        imageUrl: newImageUrl,
        analysis,
        message: "I've updated the design based on your feedback. Is this more what you had in mind?",
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Design Modification Error: ${errorMessage}`);
    }
  }
}