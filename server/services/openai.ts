import OpenAI from "openai";
import { ChatMessage } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. 
// do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";

export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      response_format: { type: "json_object" }
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
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
            { type: "text", text: "Analyze this image and suggest any needed improvements for product printing:" },
            { type: "image_url", image_url: { url: imageUrl } }
          ],
        },
      ],
    });

    return response.choices[0].message.content || "No analysis available";
  } catch (error: any) {
    throw new Error(`Image Analysis Error: ${error?.message || 'Unknown error'}`);
  }
}