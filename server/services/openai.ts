import OpenAI from "openai";
import { ChatMessage } from "@shared/schema";
import { logger } from "../utils/logger";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. 
// do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";

/**
 * Generates a chat response using OpenAI's GPT model
 * @param messages Array of previous chat messages for context
 * @returns Promise<string> Generated response content
 * @throws Error if API call fails
 */
export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  try {
    const systemMessage = {
      role: "system",
      content: `You are a product customization assistant that helps users create custom products using AI-generated designs. 
Analyze user messages and respond with a JSON object containing appropriate actions and parameters.

Response format should be JSON with these possible structures:

For general chat:
{
  "type": "chat",
  "message": "Your helpful response here"
}

For design requests:
{
  "type": "design_generation",
  "prompt": "Detailed prompt for DALL-E"
}

For product search:
{
  "type": "product_search",
  "query": "Search terms for products"
}

For design modifications:
{
  "type": "design_modification",
  "designId": "id",
  "modifications": "Description of changes"
}

Always respond with properly formatted JSON.`
    };

    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [systemMessage, ...messages],
      response_format: { type: "json_object" }
    });

    if (!response.choices[0].message.content) {
      throw new Error("Empty response from OpenAI");
    }

    logger.info("Successfully generated chat response");
    return response.choices[0].message.content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("OpenAI Chat Error", { 
      error: errorMessage,
      messages: messages.map(m => ({ role: m.role })) // Log roles only for privacy
    });
    throw new Error(`OpenAI Chat Error: ${errorMessage}`);
  }
}

/**
 * Generates an image using DALL-E based on the provided prompt
 * @param prompt Text description of the image to generate
 * @returns Promise<string> URL of the generated image
 * @throws Error if image generation fails
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data[0].url) {
      throw new Error("No image URL returned from DALL-E");
    }

    logger.info("Successfully generated image", { promptLength: prompt.length });
    return response.data[0].url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("DALL-E Image Generation Error", { 
      error: errorMessage,
      promptLength: prompt.length 
    });
    throw new Error(`DALL-E Image Generation Error: ${errorMessage}`);
  }
}

/**
 * Analyzes an image using GPT-4 Vision
 * @param imageUrl URL of the image to analyze
 * @returns Promise<string> JSON string containing analysis results or undefined if analysis fails
 */
export async function analyzeImage(imageUrl: string): Promise<string | undefined> {
  try {
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this image and provide feedback in JSON format. Include suggestions for product printing improvements:" 
            },
            { 
              type: "image_url", 
              image_url: { url: imageUrl } 
            }
          ],
        },
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      logger.warn("Empty analysis from OpenAI, skipping analysis");
      return undefined;
    }

    logger.info("Successfully analyzed image");
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Image Analysis Error", { error: errorMessage });
    logger.warn("Continuing without image analysis");
    return undefined;
  }
}