import axios from "axios";

const PRINTIFY_API_URL = "https://api.printify.com/v1";
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN;
const SHOP_ID = process.env.PRINTIFY_SHOP_ID;

const api = axios.create({
  baseURL: PRINTIFY_API_URL,
  headers: {
    Authorization: `Bearer ${PRINTIFY_TOKEN}`,
  },
});

export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  variants: PrintifyVariant[];
  images: string[];
}

export interface PrintifyVariant {
  id: number;
  title: string;
  price: number;
  is_enabled: boolean;
}

export async function getProducts(): Promise<PrintifyProduct[]> {
  try {
    console.log("Fetching Printify Products...");
    const response = await api.get(`/shops/${SHOP_ID}/products.json`);
    console.log("Printify Products API Response:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Printify Products Error:",
      error.response?.data || error.message,
    );
    throw new Error(
      `Printify Products Error: ${error?.message || "Unknown error"}`,
    );
  }
}

export async function getProduct(productId: string): Promise<PrintifyProduct> {
  try {
    console.log(`Fetching Printify Product with ID: ${productId}...`);
    const response = await api.get(
      `/shops/${SHOP_ID}/products/${productId}.json`,
    );
    console.log("Printify Product API Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Printify Product Error:",
      error.response?.data || error.message,
    );
    throw new Error(
      `Printify Product Error: ${error?.message || "Unknown error"}`,
    );
  }
}

export async function getBlueprints() {
  try {
    console.log("Fetching Printify Blueprints...");
    const response = await api.get("/catalog/blueprints.json");
    console.log("Blueprints API Response:", response.data);
    return {
      data: response.data,
      status: "success",
    };
  } catch (error: any) {
    console.error(
      "Printify Blueprints Error:",
      error.response?.data || error.message,
    );
    throw new Error(
      `Printify Blueprints Error: ${error?.message || "Unknown error"}`,
    );
  }
}

export async function getProvidersForBlueprint(blueprintId: string) {
  try {
    console.log(`Fetching print providers for blueprint ${blueprintId}...`);
    const response = await api.get(`/catalog/blueprints/${blueprintId}/print_providers.json`);
    console.log("Print Providers API Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Print Providers Error:",
      error.response?.data || error.message,
    );
    throw new Error(
      `Print Providers Error: ${error?.message || "Unknown error"}`,
    );
  }
}

export async function getVariantsForBlueprint(blueprintId: string, providerId: string) {
  try {
    console.log(`Fetching variants for blueprint ${blueprintId} and provider ${providerId}...`);
    const response = await api.get(
      `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`
    );
    console.log("Variants API Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Variants Error:",
      error.response?.data || error.message,
    );
    throw new Error(
      `Variants Error: ${error?.message || "Unknown error"}`,
    );
  }
}

export async function createProduct(data: {
  title: string;
  description: string;
  blueprint_id: string;
  print_provider_id: string;
  variants: Array<{
    id: number;
    price: number;
    is_enabled: boolean;
  }>;
  print_areas: Array<{
    variant_ids: number[];
    placeholders: Array<{
      position: string;
      images: Array<{
        id: string;
        x: number;
        y: number;
        scale: number;
        angle: number;
      }>;
    }>;
  }>;
}) {
  try {
    console.log("Creating Printify Product...", data);
    const response = await api.post(`/shops/${SHOP_ID}/products.json`, data);
    console.log("Printify Create Product API Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Printify Create Product Error:", error.response?.data || error.message);
    throw new Error(`Printify Create Product Error: ${error?.message || "Unknown error"}`);
  }
}

export async function publishProduct(productId: string) {
  try {
    console.log(`Publishing Printify Product with ID: ${productId}...`);
    const response = await api.post(
      `/shops/${SHOP_ID}/products/${productId}/publish.json`,
    );
    console.log("Printify Publish API Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Printify Publish Error:",
      error.response?.data || error.message,
    );
    throw new Error(
      `Printify Publish Error: ${error?.message || "Unknown error"}`,
    );
  }
}