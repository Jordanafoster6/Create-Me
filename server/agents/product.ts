import { getBlueprints } from "../services/printify";

export class ProductResearchAgent {
  private blueprintCache: any[] | null = null;

  async findMatchingBlueprints(details: {
    type?: string;
    color?: string;
    size?: string;
    material?: string;
  }): Promise<string> {
    try {
      // Get blueprints if not cached
      if (!this.blueprintCache) {
        const response = await getBlueprints();
        this.blueprintCache = response.data;
      }

      // Filter and rank blueprints based on product details
      const rankedBlueprints = this.rankBlueprints(this.blueprintCache, details);

      return JSON.stringify({
        blueprints: rankedBlueprints.slice(0, 5),
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Blueprint Search Error: ${errorMessage}`);
    }
  }

  private rankBlueprints(blueprints: any[], details: {
    type?: string;
    color?: string;
    size?: string;
    material?: string;
  }) {
    // Filter blueprints based on type first
    let matchedBlueprints = blueprints;
    if (details.type) {
      const typeTerms = details.type.toLowerCase().split(' ');
      matchedBlueprints = blueprints.filter(blueprint => {
        const title = blueprint.title.toLowerCase();
        return typeTerms.some(term => title.includes(term));
      });
    }

    // Rank the filtered blueprints based on other criteria
    return matchedBlueprints.sort((a, b) => {
      let aScore = 0;
      let bScore = 0;

      // Check for material match
      if (details.material) {
        if (a.materials?.some((m: any) => 
          m.toLowerCase().includes(details.material?.toLowerCase()))) {
          aScore += 2;
        }
        if (b.materials?.some((m: any) => 
          m.toLowerCase().includes(details.material?.toLowerCase()))) {
          bScore += 2;
        }
      }

      // Check for size availability
      if (details.size) {
        if (a.sizes?.includes(details.size)) aScore += 1;
        if (b.sizes?.includes(details.size)) bScore += 1;
      }

      return bScore - aScore;
    });
  }

  clearCache() {
    this.blueprintCache = null;
  }
}