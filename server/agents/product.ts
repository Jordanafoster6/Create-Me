import { getBlueprints } from "../services/printify";

export class ProductResearchAgent {
  async handleSearch(query: string): Promise<string> {
    try {
      const blueprints = await getBlueprints();

      // Filter and rank blueprints based on query
      const rankedBlueprints = this.rankBlueprints(blueprints.data, query);

      return JSON.stringify({
        type: "products",
        products: rankedBlueprints.slice(0, 5).map(blueprint => ({
          id: blueprint.id,
          title: blueprint.title,
          images: [blueprint.image],
          description: blueprint.description,
          variants: blueprint.variants
        })),
        message: "These are the base products available for customization. Which one would you like to use?"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Product Search Error: ${errorMessage}`);
    }
  }

  private rankBlueprints(blueprints: any[], query: string) {
    const searchTerms = query.toLowerCase().split(' ');

    // Add relevance score to each blueprint
    const scoredBlueprints = blueprints.map(blueprint => {
      let score = 0;
      const title = blueprint.title.toLowerCase();
      const description = blueprint.description?.toLowerCase() || '';
      const brand = blueprint.brand?.toLowerCase() || '';

      searchTerms.forEach(term => {
        // Primary matches
        if (title.includes(term)) score += 3;
        if (description.includes(term)) score += 1;
        if (brand.includes(term)) score += 1;

        // Category matches
        if (term === 't-shirt' || term === 'tshirt') {
          if (title.includes('t-shirt') || title.includes('tee')) score += 2;
        }
        if (term === 'hoodie' || term === 'sweatshirt') {
          if (title.includes('hoodie') || title.includes('sweatshirt')) score += 2;
        }

        // Color matches (if blueprint supports the color)
        if (blueprint.variants?.some((variant: any) => 
          variant.options?.some((option: any) => 
            option.value.toLowerCase().includes(term)
          )
        )) {
          score += 2;
        }
      });

      return { ...blueprint, score };
    });

    // Sort by score descending
    return scoredBlueprints
      .filter(b => b.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}