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