/**
 * Product Research and Ranking System
 * Searches Printify catalog and ranks products based on user requirements
 * Maintains pagination state for batch results
 */
import { getBlueprints } from "../services/printify";
import { ProductSearchResponseSchema, PrintifyBlueprint } from "@shared/schema";
import { logger } from "../utils/logger";

type ProductDetails = {
  type?: string;
  color?: string;
  size?: string;
  material?: string;
};

export class ProductResearchAgent {
  // Track shown products to avoid duplicates
  private shownProducts: Set<string> = new Set();
  // Pre-ranked list of matching products
  private rankedBlueprints: PrintifyBlueprint[] = [];
  // Number of products per results page
  private readonly PAGE_SIZE = 3;

  /**
   * Main product search entry point
   * @param productDetails - Filter criteria from user
   * @param resetSearch - Whether to start new search
   * @returns Paginated product results
   */
  async handleSearch(
    productDetails: ProductDetails,
    resetSearch: boolean = true,
  ): Promise<string> {
    try {
      logger.info("Initiating product search", { productDetails });

      if (resetSearch) {
        await this.initializeNewSearch(productDetails);
      }

      // Get next page of results
      const results = this.getNextPage();

      return this.buildResponse(results);
    } catch (error) {
      this.handleError(error, productDetails);
    }
  }

  /** Finds a blueprint by its ID from ranked results */
  public async getBlueprintById(
    blueprintId: number,
  ): Promise<PrintifyBlueprint | null> {
    // First check current ranked list
    const match = this.rankedBlueprints.find((bp) => bp.id === blueprintId);
    if (match) return match;

    // Fallback: refetch full catalog (optional but recommended)
    const response = await getBlueprints();
    console.log("blueprints", response.data); // remove this
    if (!response?.data) return null;

    const allBlueprints = Array.isArray(response.data)
      ? response.data
      : [response.data];

    return allBlueprints.find((bp) => bp.id === blueprintId) || null;
  }

  /** Prepares new search with fresh rankings */
  private async initializeNewSearch(details: ProductDetails) {
    const response = await getBlueprints();

    if (!response?.data) {
      logger.error("Invalid blueprint response", { response });
      throw new Error("Invalid catalog data");
    }

    this.shownProducts.clear();
    this.rankedBlueprints = this.rankBlueprints(
      Array.isArray(response.data) ? response.data : [response.data],
      details,
    );
  }

  /** Gets next page of unshown products */
  private getNextPage() {
    return this.rankedBlueprints
      .filter((prod) => !this.shownProducts.has(prod.id.toString()))
      .slice(0, this.PAGE_SIZE)
      .map((prod) => {
        this.shownProducts.add(prod.id.toString());
        return prod;
      });
  }

  /** Builds validated API response */
  private buildResponse(results: PrintifyBlueprint[]) {
    const remaining = this.rankedBlueprints.length - this.shownProducts.size;

    const response = ProductSearchResponseSchema.parse({
      products: results,
      hasMore: remaining > 0,
      totalRemaining: remaining,
      status: "success",
    });

    logger.info("Search results prepared", { count: results.length });
    return JSON.stringify(response);
  }

  /** Product ranking algorithm */
  private rankBlueprints(
    blueprints: PrintifyBlueprint[],
    details: ProductDetails,
  ) {
    return blueprints
      .map((blueprint) => ({
        blueprint,
        score: this.calculateMatchScore(blueprint, details),
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ blueprint }) => blueprint);
  }

  /** Scoring logic for product matches */
  private calculateMatchScore(
    blueprint: PrintifyBlueprint,
    details: ProductDetails,
  ) {
    let score = 0;
    const { title = "", description = "", variants = [] } = blueprint;

    // Type matching
    if (details.type) {
      const typeMatch = [title, description].some((text) =>
        text.toLowerCase().includes(details.type!.toLowerCase()),
      );
      score += typeMatch ? 3 : 0;
    }

    // Variant attribute matching
    variants.forEach((variant) => {
      if (
        details.color &&
        variant.options?.color?.toLowerCase().includes(details.color)
      ) {
        score += 2;
      }
      if (
        details.material &&
        variant.options?.material?.includes(details.material)
      ) {
        score += 2;
      }
    });

    return score;
  }

  /** Unified error handler */
  private handleError(error: unknown, details: ProductDetails): never {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Product Search Failed", { error: message, details });
    throw new Error(`Product Search Error: ${message}`);
  }
}
