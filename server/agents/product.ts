import { getBlueprints } from "../services/printify";
import { PrintifyBlueprint, ProductResponse } from "@shared/schema";

interface ProductDetails {
  type?: string;
  color?: string;
  size?: string;
  material?: string;
}

export class ProductResearchAgent {
  private shownProducts: Set<string> = new Set();
  private rankedBlueprints: PrintifyBlueprint[] = [];
  private BATCH_SIZE = 3;

  async handleSearch(productDetails: ProductDetails, resetSearch: boolean = true): Promise<string> {
    try {
      console.log('Searching with product details:', productDetails);

      // Only fetch and rank products if this is a new search or reset was requested
      if (resetSearch || this.rankedBlueprints.length === 0) {
        const blueprintsResponse = await getBlueprints();
        console.log('Received blueprints response:', blueprintsResponse);

        // Ensure we have valid data before proceeding
        if (!blueprintsResponse || !blueprintsResponse.data) {
          console.error('Invalid blueprints response:', blueprintsResponse);
          throw new Error('Invalid response from Printify blueprints API');
        }

        // Get the array of blueprints from the response
        const blueprints = Array.isArray(blueprintsResponse.data) ?
          blueprintsResponse.data :
          [blueprintsResponse.data];

        // Reset shown products and ranked blueprints
        this.shownProducts.clear();
        this.rankedBlueprints = this.rankBlueprints(blueprints, productDetails);
        console.log('Ranked blueprints:', this.rankedBlueprints);
      }

      // Get next batch of unshown products
      const nextBatch = this.rankedBlueprints
        .filter(product => !this.shownProducts.has(product.id.toString()))
        .slice(0, this.BATCH_SIZE)
        .map(blueprint => this.transformToProductResponse(blueprint));

      // Mark these products as shown
      nextBatch.forEach(product => this.shownProducts.add(product.id.toString()));

      // Calculate if more products are available
      const remainingProducts = this.rankedBlueprints.length - this.shownProducts.size;

      return JSON.stringify({
        products: nextBatch,
        hasMore: remainingProducts > 0,
        totalRemaining: remainingProducts,
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Product Search Error: ${errorMessage}`);
    }
  }

  private transformToProductResponse(blueprint: PrintifyBlueprint): ProductResponse {
    // Combine all possible image sources into a single array
    const images = [
      ...(blueprint.images || []),
      ...(blueprint.image ? [blueprint.image] : []),
      ...(blueprint.preview ? [blueprint.preview] : [])
    ];

    return {
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description || '',
      images: images.length > 0 ? images : []
    };
  }

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

        console.log('Ranking blueprint:', { title, description });

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

        return {
          ...blueprint,
          matchScore: score
        };
      })
      .sort((a, b) => (b as any).matchScore - (a as any).matchScore)
      .map(({ matchScore, ...blueprint }) => blueprint); // Remove the score before returning
  }
}