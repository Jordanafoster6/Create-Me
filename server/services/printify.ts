import axios from "axios";
import { logger } from "../utils/logger";
import {
  PrintifyVariant,
  PrintifyBlueprint,
  ProductSearchResponse,
  PrintifyProduct
} from "@shared/schema";

const PRINTIFY_API_URL = "https://api.printify.com/v1";
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN;
const SHOP_ID = process.env.PRINTIFY_SHOP_ID;

if (!PRINTIFY_TOKEN || !SHOP_ID) {
  throw new Error("Missing required Printify credentials");
}

// Initialize axios instance with base configuration
const api = axios.create({
  baseURL: PRINTIFY_API_URL,
  headers: {
    Authorization: `Bearer ${PRINTIFY_TOKEN}`,
  },
});

/**
 * Retrieves all blueprints (product templates) from Printify catalog
 * @returns Promise<{ data: PrintifyBlueprint[], status: string }>
 * @throws Error if API request fails or returns invalid data
 */
export async function getBlueprints(): Promise<{ data: PrintifyBlueprint[], status: string }> {
  try {
    const response = await api.get("/catalog/blueprints.json");

    // Validate response data structure
    if (!response.data) {
      throw new Error("Invalid response structure from Printify API");
    }

    logger.info("Successfully retrieved Printify blueprints");
    return {
      data: response.data,
      status: "success"
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Failed to fetch Printify blueprints", { error: errorMessage });
    throw new Error(`Printify Blueprints Error: ${errorMessage}`);
  }
}

/**
 * Creates a new product in Printify shop with specified configuration
 * @param config Product configuration including title, description, blueprint ID, and print areas
 * @returns Promise<PrintifyBlueprint> Newly created product
 * @throws Error if product creation fails
 */
export async function createProduct(config: {
  title: string;
  description: string;
  blueprint_id: string;
  print_areas: Record<string, { src: string }>;
  variant_ids: number[];
}): Promise<PrintifyBlueprint> {
  try {
    const response = await api.post(`/shops/${SHOP_ID}/products.json`, config);

    logger.info("Successfully created Printify product", { productId: response.data.id });
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Failed to create Printify product", { 
      error: errorMessage,
      config
    });
    throw new Error(`Printify Create Product Error: ${errorMessage}`);
  }
}

/**
 * Publishes a product to make it available in the shop
 * @param productId ID of the product to publish
 * @returns Promise<any> Publishing confirmation
 * @throws Error if publishing fails
 */
export async function publishProduct(productId: string): Promise<any> {
  try {
    const response = await api.post(
      `/shops/${SHOP_ID}/products/${productId}/publish.json`
    );

    logger.info("Successfully published Printify product", { productId });
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Failed to publish Printify product", { 
      error: errorMessage,
      productId 
    });
    throw new Error(`Printify Publish Error: ${errorMessage}`);
  }
}

export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  variants: PrintifyVariant[];
  images: string[];
}


export async function getProducts(): Promise<PrintifyProduct[]> {
  try {
    logger.info("Fetching Printify Products...");
    const response = await api.get(`/shops/${SHOP_ID}/products.json`);
    logger.info("Printify Products API Response:", response.data);
    return response.data.data;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Printify Products Error:", errorMessage);
    throw new Error(`Printify Products Error: ${errorMessage}`);
  }
}

export async function getProduct(productId: string): Promise<PrintifyProduct> {
  try {
    logger.info(`Fetching Printify Product with ID: ${productId}...`);
    const response = await api.get(
      `/shops/${SHOP_ID}/products/${productId}.json`,
    );
    logger.info("Printify Product API Response:", response.data);
    return response.data;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Printify Product Error:", errorMessage);
    throw new Error(`Printify Product Error: ${errorMessage}`);
  }
}