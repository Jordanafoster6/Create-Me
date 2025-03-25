/**
 * Product Configuration Service
 * Handles Printify product creation and publishing
 */
import { createProduct, publishProduct } from "../services/printify";
import { logger } from "../utils/logger";

type ProductConfig = {
  blueprint_id: string;
  title: string;
  description: string;
  print_areas: {
    front: { src: string };
  };
  variant_ids: number[];
};

export class ConfigurationAgent {
  /**
   * Creates and publishes a configured product
   * @param productId - Printify blueprint ID
   * @param designUrl - URL of generated design image
   * @returns Printify product creation result
   */
  async configureProduct(
    productId: string,
    designUrl: string,
  ): Promise<string> {
    try {
      logger.info("Configuring product", { productId });

      // TODO: Make sure build config function does a comprehensive config
      const config = this.buildConfig(productId, designUrl);
      // Create product on Printify
      const product = await createProduct(config);
      await publishProduct(product.id);

      logger.info("Product published successfully", { productId: product.id });
      return JSON.stringify({ productId: product.id, status: "success" });
    } catch (error) {
      this.handleError(error, productId, designUrl);
    }
  }

  /** Constructs Printify API payload */
  private buildConfig(productId: string, designUrl: string): ProductConfig {
    return {
      blueprint_id: productId,
      title: "Custom Design Product",
      description: "AI-Generated Custom Product",
      print_areas: { front: { src: designUrl } },
      variant_ids: [1], // Default variant
    };
  }

  /** Error handling with context */
  private handleError(
    error: unknown,
    productId: string,
    designUrl: string,
  ): never {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Configuration Failed", {
      error: message,
      productId,
      designUrl,
    });
    throw new Error(`Product Configuration Error: ${message}`);
  }
}
