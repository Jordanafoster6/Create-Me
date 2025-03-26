import { Card } from "@/components/ui/card";
import {
  ChatMessage,
  DesignAnalysis,
  OrchestratorResponse,
  PrintifyBlueprint,
} from "@shared/schema";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ProductPreview } from "@/components/product/preview";

interface MessageProps {
  message: ChatMessage;
  onProductSelect?: (productId: number) => void;
}

export function Message({ message, onProductSelect }: MessageProps) {
  const isUser = message.role === "user";
  let response: OrchestratorResponse | null = null;

  if (!isUser && message.content) {
    try {
      response = JSON.parse(message.content);
      console.log(response); // TODO: remove this
    } catch (error) {
      console.warn("Message is not JSON:", message.content);
    }
  }

  return (
    <div className={cn("flex mb-4", isUser ? "justify-end" : "justify-start")}>
      <Card
        className={cn(
          "max-w-[80%] p-4",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary",
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : response ? (
          <div className="space-y-4">
            {response.type === "chat" && (
              <p className="text-sm whitespace-pre-wrap">{response.message}</p>
            )}

            {(response.type === "product_selection" && response.selectedProduct) && (
              <>
                <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                <ProductPreview
                  key={response.selectedProduct.id}
                  imageUrl={response.selectedProduct.images[0]}
                  productName={response.selectedProduct.title}
                />
              </>
            )}

            {(response.type === "design" ||
              response.type === "design_and_products") && (
              <>
                {response.message && (
                  <p className="text-sm mb-2">{response.message}</p>
                )}

                {(response.type === "design" ? response : response.design) && (
                  <>
                    <p className="text-sm mb-2">Here's your design:</p>
                    <AspectRatio ratio={1}>
                      <img
                        src={
                          response.type === "design"
                            ? response.imageUrl
                            : response.design.imageUrl
                        }
                        alt="Generated design"
                        className="rounded-md object-cover w-full h-full"
                      />
                    </AspectRatio>
                  </>
                )}

                {(response.type === "design"
                  ? response.analysis
                  : response.design?.analysis) && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Design Analysis:</h4>
                    {(() => {
                      try {
                        const analysis: DesignAnalysis = JSON.parse(
                          response.type === "design"
                            ? response.analysis
                            : response.design.analysis,
                        );
                        if (!analysis?.imageAnalysis?.description) return null;

                        return (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {analysis.imageAnalysis.description}
                            </p>
                            {analysis.suggestions &&
                              Object.entries(analysis.suggestions).length >
                                0 && (
                                <>
                                  <h4 className="font-medium mt-3">
                                    Suggestions:
                                  </h4>
                                  <ul className="text-sm text-muted-foreground list-disc pl-4">
                                    {Object.entries(analysis.suggestions).map(
                                      ([key, value]) => (
                                        <li key={key}>{value}</li>
                                      ),
                                    )}
                                  </ul>
                                </>
                              )}
                          </>
                        );
                      } catch (error) {
                        console.warn("Could not parse design analysis:", error);
                        return null;
                      }
                    })()}
                  </div>
                )}

                {response.type === "design_and_products" &&
                  response.products &&
                  response.products.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Available Products:</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {response.products.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => onProductSelect?.(product.id)}
                            className="text-left hover:ring-2 ring-primary rounded-lg transition"
                          >
                            <ProductPreview
                              imageUrl={product.images[0]}
                              productName={product.title}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </Card>
    </div>
  );
}