import { createProduct, publishProduct } from "../services/printify";
import { logger } from "../utils/logger";

interface ProductConfig {
  title: string;
  description: string;
  blueprint_id: string;
  print_areas: {
    front: { src: string };
  };
  variant_ids: number[];
}

/**
 * Configuration Agent handles the creation and publishing of customized products
 */
export class ConfigurationAgent {
  /**
   * Configures a new product with the specified design
   * @param productId Blueprint ID of the product to create
   * @param designId ID/URL of the design to apply
   * @returns Promise<string> JSON string containing configuration result
   * @throws Error if product configuration or publishing fails
   */
  async configureProduct(productId: string, designId: string): Promise<string> {
    try {
      logger.info("Starting product configuration", { productId, designId });

      // Create product configuration
      const config: ProductConfig = {
        title: "Custom Design Product",
        description: "Uniquely designed product using AI",
        blueprint_id: productId,
        print_areas: {
          front: { src: designId }
        },
        variant_ids: [1] // Default variant
      };

      // Create and publish the product
      const product = await createProduct(config);
      await publishProduct(product.id);

      const response = {
        productId: product.id,
        status: "success"
      };

      logger.info("Successfully configured and published product", {
        productId: product.id
      });

      return JSON.stringify(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Product Configuration Error", { 
        error: errorMessage,
        productId,
        designId
      });
      throw new Error(`Product Configuration Error: ${errorMessage}`);
    }
  }
}