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
    const response = await api.get(`/shops/${SHOP_ID}/products.json`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(`Printify Products Error: ${error?.message || 'Unknown error'}`);
  }
}

export async function getProduct(productId: string): Promise<PrintifyProduct> {
  try {
    const response = await api.get(`/shops/${SHOP_ID}/products/${productId}.json`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Printify Product Error: ${error?.message || 'Unknown error'}`);
  }
}

export async function createProduct(data: {
  title: string;
  description: string;
  blueprint_id: string;
  print_areas: Record<string, { src: string }>;
  variant_ids: number[];
}) {
  try {
    const response = await api.post(`/shops/${SHOP_ID}/products.json`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(`Printify Create Product Error: ${error?.message || 'Unknown error'}`);
  }
}

export async function getBlueprints() {
  try {
    const response = await api.get('/catalog/blueprints.json');
    return response.data;
  } catch (error: any) {
    throw new Error(`Printify Blueprints Error: ${error?.message || 'Unknown error'}`);
  }
}

export async function publishProduct(productId: string) {
  try {
    const response = await api.post(`/shops/${SHOP_ID}/products/${productId}/publish.json`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Printify Publish Error: ${error?.message || 'Unknown error'}`);
  }
}