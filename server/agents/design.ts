import { generateImage, analyzeImage } from "../services/openai";
import { DesignAnalysis } from "@shared/schema";

export class DesignAgent {
  private originalPrompt: string = "";
  private currentPrompt: string = "";

  async generateDesign(prompt: string): Promise<string> {
    try {
      // Store the original prompt
      this.originalPrompt = prompt;
      this.currentPrompt = prompt;

      // Generate image using DALL-E
      const imageUrl = await generateImage(prompt);
      console.log('Generated image URL:', imageUrl);

      // Analyze the generated image
      const analysis = await analyzeImage(imageUrl);
      console.log('Image analysis:', analysis);

      return JSON.stringify({
        type: "design",
        imageUrl,
        analysis,
        originalPrompt: this.originalPrompt,
        currentPrompt: this.currentPrompt,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Design Generation Error: ${errorMessage}`);
    }
  }

  async modifyDesign(previousDesign: string, modifications: string): Promise<string> {
    try {
      // Parse the previous design to get the context
      const prevDesignData = JSON.parse(previousDesign);

      // Combine the original context with modifications
      this.currentPrompt = `Original design was: ${prevDesignData.currentPrompt}. 
Modifications requested: ${modifications}
Keep the core elements while applying these modifications.`;

      // Generate new image with combined context
      const newImageUrl = await generateImage(this.currentPrompt);
      console.log('Generated modified image URL:', newImageUrl);

      // Analyze the new image
      const analysis = await analyzeImage(newImageUrl);
      console.log('Modified image analysis:', analysis);

      return JSON.stringify({
        type: "design",
        imageUrl: newImageUrl,
        analysis,
        originalPrompt: prevDesignData.originalPrompt,
        currentPrompt: this.currentPrompt,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Design Modification Error: ${errorMessage}`);
    }
  }
}