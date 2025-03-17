import { generateImage, analyzeImage } from "../services/openai";

export class DesignAgent {
  async generateDesign(prompt: string): Promise<string> {
    try {
      // Generate image using DALL-E
      const imageUrl = await generateImage(prompt);

      // Analyze the generated image
      const analysis = await analyzeImage(imageUrl);

      return JSON.stringify({
        imageUrl,
        analysis,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Design Generation Error: ${errorMessage}`);
    }
  }

  async modifyDesign(designId: string, modifications: string): Promise<string> {
    try {
      // Get existing design
      // Apply modifications using DALL-E
      const newImageUrl = await generateImage(modifications);

      return JSON.stringify({
        imageUrl: newImageUrl,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Design Modification Error: ${errorMessage}`);
    }
  }
}