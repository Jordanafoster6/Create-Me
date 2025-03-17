import OpenAI from "openai";
import { ChatMessage } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. 
// do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";

export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  try {
    const systemMessage = {
      role: "system",
      content: `You are a product customization assistant that helps users create custom products using AI-generated designs. 
When a user provides a request that includes any design elements or visual description, ALWAYS treat it as a design request first.

Parse messages and respond with a JSON object in one of these formats:

For design requests (use this if ANY design/visual elements are mentioned):
{
  "type": "parse",
  "productDetails": {
    "type": "product type mentioned (e.g., t-shirt, mug)",
    "color": "color if mentioned",
    "size": "size if mentioned",
    "material": "material if mentioned"
  },
  "designContent": "description of ONLY the visual/artistic elements (e.g., cartoonish beagle)"
}

For product-only queries (use ONLY if no design elements mentioned):
{
  "type": "chat",
  "message": "Your helpful response asking for design details"
}

Always prioritize design creation before product selection.`
    };

    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [systemMessage, ...messages],
      response_format: { type: "json_object" }
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error('OpenAI Chat Error:', error);
    throw new Error(`OpenAI Chat Error: ${error?.message || 'Unknown error'}`);
  }
}

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

    return response.data[0].url;
  } catch (error: any) {
    console.error('DALL-E Image Generation Error:', error);
    throw new Error(`DALL-E Image Generation Error: ${error?.message || 'Unknown error'}`);
  }
}

export async function analyzeImage(imageUrl: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image and provide feedback in JSON format. Include suggestions for product printing improvements:" },
            { type: "image_url", image_url: { url: imageUrl } }
          ],
        },
      ],
      response_format: { type: "json_object" }
    });

    return response.choices[0].message.content || "No analysis available";
  } catch (error: any) {
    console.error('Image Analysis Error:', error);
    throw new Error(`Image Analysis Error: ${error?.message || 'Unknown error'}`);
  }
}