import { getProducts, getProduct } from "../services/printify";

export class ProductResearchAgent {
  async handleSearch(query: string): Promise<string> {
    try {
      const products = await getProducts();

      // Filter and rank products based on query
      const rankedProducts = this.rankProducts(products, query);

      return JSON.stringify({
        products: rankedProducts.slice(0, 5),
        status: "success"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Product Search Error: ${errorMessage}`);
    }
  }

  private rankProducts(products: any[], query: string) {
    // Simple ranking based on text matching
    return products.sort((a, b) => {
      const aScore = this.calculateRelevance(a, query);
      const bScore = this.calculateRelevance(b, query);
      return bScore - aScore;
    });
  }

  private calculateRelevance(product: any, query: string): number {
    const searchTerms = query.toLowerCase().split(' ');
    let score = 0;

    searchTerms.forEach(term => {
      if (product.title.toLowerCase().includes(term)) score += 2;
      if (product.description.toLowerCase().includes(term)) score += 1;
    });

    return score;
  }
}