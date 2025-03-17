import { getBlueprints } from "../services/printify";

interface ProductDetails {
  type?: string;
  color?: string;
  size?: string;
  material?: string;
}

export class ProductResearchAgent {
  async handleSearch(productDetails: ProductDetails): Promise<string> {
    try {
      const blueprints = await getBlueprints();

      // Filter and rank blueprints based on product details
      const rankedBlueprints = this.rankBlueprints(blueprints.data, productDetails);

      return JSON.stringify({
        products: rankedBlueprints.slice(0, 5),
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Product Search Error: ${errorMessage}`);
    }
  }

  private rankBlueprints(blueprints: any[], productDetails: ProductDetails) {
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
        const title = blueprint.title.toLowerCase();
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
          blueprint.variants.forEach((variant: any) => {
            if (variant.options?.color?.toLowerCase().includes(color)) {
              score += 2;
            }
          });
        }

        // Check material if specified
        if (productDetails.material && blueprint.variants) {
          const material = productDetails.material.toLowerCase();
          blueprint.variants.forEach((variant: any) => {
            if (variant.options?.material?.toLowerCase().includes(material)) {
              score += 2;
            }
          });
        }

        return {
          ...blueprint,
          matchScore: score
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(({ matchScore, ...blueprint }) => blueprint); // Remove the score before returning
  }
}