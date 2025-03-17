import { getBlueprints, getProvidersForBlueprint, getVariantsForBlueprint, createProduct, publishProduct } from "../services/printify";
import { ProductConfig } from "@shared/schema";

export class ConfigurationAgent {
  async configureProduct(selectedProduct: any, designUrl: string): Promise<string> {
    try {
      // First, get print providers for the selected blueprint
      const providers = await getProvidersForBlueprint(selectedProduct.id);

      // Find the Printify Choice provider or use the first available provider
      const printProvider = providers.find((p: any) => p.title === "Printify Choice") || providers[0];

      if (!printProvider) {
        throw new Error("No print provider available for this product");
      }

      // Get variants for the selected blueprint and print provider
      const variantsResponse = await getVariantsForBlueprint(selectedProduct.id, printProvider.id);

      if (!variantsResponse.variants || variantsResponse.variants.length === 0) {
        throw new Error("No variants available for this product");
      }

      // Fetch image from URL and upload to Printify
      console.log("Getting image from URL:", designUrl);
      const imageResponse = await fetch(designUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Get image content type
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const extension = contentType.includes('png') ? 'png' : 'jpg';

      // Upload image to Printify
      console.log("Uploading image to Printify");
      const uploadResponse = await fetch(`https://api.printify.com/v1/uploads/images.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_name: `design_${Date.now()}.${extension}`,
          contents: base64Image
        })
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(`Failed to upload image to Printify: ${JSON.stringify(errorData)}`);
      }

      const uploadData = await uploadResponse.json();
      const imageId = uploadData.id;

      // Create product configuration with the first variant
      const config = {
        title: "Custom Design Product",
        description: "Uniquely designed product using AI",
        blueprint_id: selectedProduct.id,
        print_provider_id: printProvider.id,
        variants: variantsResponse.variants.slice(0, 1).map((variant: any) => ({
          id: variant.id,
          price: 25.99, // Default price, can be adjusted
          is_enabled: true
        })),
        print_areas: [{
          variant_ids: variantsResponse.variants.slice(0, 1).map((v: any) => v.id),
          placeholders: [{
            position: "front",
            images: [{
              id: imageId,
              x: 0.5,
              y: 0.5,
              scale: 1.0,
              angle: 0
            }]
          }]
        }]
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
      // Get print providers first
      const providers = await getProvidersForBlueprint(blueprintId);
      const printProvider = providers.find((p: any) => p.title === "Printify Choice") || providers[0];

      if (!printProvider) {
        throw new Error(`No print provider found for blueprint ${blueprintId}`);
      }

      const variantsResponse = await getVariantsForBlueprint(blueprintId, printProvider.id);

      return JSON.stringify({
        type: "product_variants",
        variants: variantsResponse.variants,
        printProviderId: printProvider.id,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Variant Fetch Error: ${errorMessage}`);
    }
  }
}