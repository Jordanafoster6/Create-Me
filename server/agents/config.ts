import { createProduct, publishProduct } from "../services/printify";

export class ConfigurationAgent {
  async configureProduct(productId: string, designId: string): Promise<string> {
    try {
      // Create product configuration
      const config = {
        title: "Custom Design Product",
        description: "Uniquely designed product using AI",
        blueprint_id: productId,
        print_areas: {
          front: { src: designId }
        },
        variant_ids: [1] // Default variant
      };

      const product = await createProduct(config);

      // Publish the product
      await publishProduct(product.id);

      return JSON.stringify({
        productId: product.id,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Product Configuration Error: ${errorMessage}`);
    }
  }
}