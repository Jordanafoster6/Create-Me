import { getBlueprints, createProduct, publishProduct } from "../services/printify";
import { ProductConfig } from "@shared/schema";

export class ConfigurationAgent {
  async configureProduct(selectedProduct: any, designUrl: string): Promise<string> {
    try {
      // Create product configuration
      const config = {
        title: "Custom Design Product",
        description: "Uniquely designed product using AI",
        blueprint_id: selectedProduct.id,
        print_areas: {
          front: { src: designUrl }
        },
        variant_ids: selectedProduct.variants?.slice(0, 1).map((v: any) => v.id) || [1] // Default to first variant
      };

      // Create the product in Printify
      const product = await createProduct(config);

      // Publish the product
      await publishProduct(product.id);

      return JSON.stringify({
        type: "product_configured",
        productId: product.id,
        status: "success",
        message: "Your custom product has been created and is ready for purchase!"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Product Configuration Error: ${errorMessage}`);
    }
  }

  async getProductVariants(blueprintId: string): Promise<string> {
    try {
      const blueprints = await getBlueprints();
      const blueprint = Array.isArray(blueprints.data) ? 
        blueprints.data.find((b: any) => b.id === blueprintId) :
        blueprints.data.id === blueprintId ? blueprints.data : null;

      if (!blueprint) {
        throw new Error(`Blueprint ${blueprintId} not found`);
      }

      return JSON.stringify({
        type: "product_variants",
        variants: blueprint.variants,
        printAreas: blueprint.print_areas,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Variant Fetch Error: ${errorMessage}`);
    }
  }
}