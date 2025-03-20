import { getBlueprints } from "../services/printify";
import { 
  PrintifyBlueprint,
  ProductSearchResponse,
  ProductSearchResponseSchema
} from "@shared/schema";
import { logger } from "../utils/logger";

interface ProductDetails {
  type?: string;
  color?: string;
  size?: string;
  material?: string;
}

/**
 * Product Research Agent handles searching and ranking of available product blueprints
 * based on user requirements
 */
export class ProductResearchAgent {
  private shownProducts: Set<string> = new Set();
  private rankedBlueprints: PrintifyBlueprint[] = [];
  private readonly BATCH_SIZE = 3;

  /**
   * Searches for products matching the specified criteria
   * @param productDetails Details of the desired product
   * @param resetSearch Whether to start a new search or continue from previous results
   * @returns Promise<string> JSON string containing matched products
   * @throws Error if product search fails
   */
  async handleSearch(productDetails: ProductDetails, resetSearch: boolean = true): Promise<string> {
    try {
      logger.info("Starting product search", { productDetails, resetSearch });

      // Only fetch and rank products if this is a new search or reset was requested
      if (resetSearch || this.rankedBlueprints.length === 0) {
        const blueprintsResponse = await getBlueprints();

        // Ensure we have valid data before proceeding
        if (!blueprintsResponse || !blueprintsResponse.data) {
          logger.error("Invalid blueprints response", { response: blueprintsResponse });
          throw new Error('Invalid response from Printify blueprints API');
        }

        // Get the array of blueprints from the response
        const blueprints = Array.isArray(blueprintsResponse.data) ? 
          blueprintsResponse.data : 
          [blueprintsResponse.data];

        // Reset shown products and ranked blueprints
        this.shownProducts.clear();
        this.rankedBlueprints = this.rankBlueprints(blueprints, productDetails);
      }

      // Get next batch of unshown products
      const nextBatch = this.rankedBlueprints
        .filter(product => !this.shownProducts.has(product.id.toString()))
        .slice(0, this.BATCH_SIZE);

      // Mark these products as shown
      nextBatch.forEach(product => this.shownProducts.add(product.id.toString()));

      // Calculate if more products are available
      const remainingProducts = this.rankedBlueprints.length - this.shownProducts.size;

      const response: ProductSearchResponse = {
        products: nextBatch,
        hasMore: remainingProducts > 0,
        totalRemaining: remainingProducts,
        status: "success"
      };

      // Validate response format
      const validatedResponse = ProductSearchResponseSchema.parse(response);

      logger.info("Successfully completed product search", {
        resultsCount: nextBatch.length,
        remainingProducts
      });

      return JSON.stringify(validatedResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Product Search Error", { 
        error: errorMessage,
        productDetails 
      });
      throw new Error(`Product Search Error: ${errorMessage}`);
    }
  }

  /**
   * Ranks blueprints based on how well they match the product details
   * @param blueprints Array of available product blueprints
   * @param productDetails Desired product specifications
   * @returns Array<PrintifyBlueprint> Ranked blueprints
   */
  private rankBlueprints(blueprints: PrintifyBlueprint[], productDetails: ProductDetails): PrintifyBlueprint[] {
    // Create a mapping of common product type variations
    const productTypeMap: { [key: string]: string[] } = {
      'tshirt': ['t-shirt', 'tee', 'shirt'],
      'hoodie': ['hooded', 'sweatshirt', 'hood'],
      'mug': ['cup', 'coffee mug', 'drink'],
      'poster': ['print', 'wall art', 'artwork'],
    };

    return blueprints
      .map(blueprint => {
        let score = 0;
        const title = blueprint.title?.toLowerCase() || '';
        const description = blueprint.description?.toLowerCase() || '';

        // Check product type match
        if (productDetails.type) {
          const searchType = productDetails.type.toLowerCase();
          // Direct match
          if (title.includes(searchType) || description.includes(searchType)) {
            score += 3;
          }
          // Check variations
          for (const [baseType, variations] of Object.entries(productTypeMap)) {
            if (searchType.includes(baseType)) {
              variations.forEach(variant => {
                if (title.includes(variant) || description.includes(variant)) {
                  score += 2;
                }
              });
            }
          }
        }

        // Check color availability if specified
        if (productDetails.color && blueprint.variants) {
          const color = productDetails.color.toLowerCase();
          blueprint.variants.forEach(variant => {
            if (variant.options?.color?.toLowerCase().includes(color)) {
              score += 2;
            }
          });
        }

        // Check material if specified
        if (productDetails.material && blueprint.variants) {
          const material = productDetails.material.toLowerCase();
          blueprint.variants.forEach(variant => {
            if (variant.options?.material?.toLowerCase().includes(material)) {
              score += 2;
            }
          });
        }

        return {
          blueprint,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ blueprint }) => blueprint);
  }
}