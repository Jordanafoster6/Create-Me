import { Card } from "@/components/ui/card";
import { ChatMessage, DesignAnalysis, OrchestratorResponse } from "@shared/schema";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ProductPreview } from "@/components/product/preview";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  let response: OrchestratorResponse | null = null;

  if (!isUser && message.content) {
    try {
      response = JSON.parse(message.content);
    } catch (error) {
      console.warn("Message is not JSON:", message.content);
    }
  }

  return (
    <div
      className={cn(
        "flex mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <Card
        className={cn(
          "max-w-[80%] p-4",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : response ? (
          <div className="space-y-4">
            {/* Display chat message */}
            {response.type === "chat" && (
              <p className="text-sm whitespace-pre-wrap">{response.message}</p>
            )}

            {/* Display design with analysis */}
            {response.type === "design" && (
              <>
                {response.message && (
                  <p className="text-sm mb-2">{response.message}</p>
                )}

                <AspectRatio ratio={1}>
                  <img
                    src={response.imageUrl}
                    alt="Generated design"
                    className="rounded-md object-cover w-full h-full"
                  />
                </AspectRatio>

                {response.analysis && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Design Analysis:</h4>
                    {(() => {
                      try {
                        const analysis: DesignAnalysis = JSON.parse(response.analysis);
                        if (!analysis?.imageAnalysis?.description) return null;

                        return (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {analysis.imageAnalysis.description}
                            </p>
                            {analysis.suggestions && Object.entries(analysis.suggestions).length > 0 && (
                              <>
                                <h4 className="font-medium mt-3">Suggestions:</h4>
                                <ul className="text-sm text-muted-foreground list-disc pl-4">
                                  {Object.entries(analysis.suggestions).map(([key, value]) => (
                                    <li key={key}>{value}</li>
                                  ))}
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
              </>
            )}

            {/* Display product selection */}
            {response.type === "product_selection" && response.products && response.products.length > 0 && (
              <>
                <p className="text-sm mb-4">{response.message}</p>
                <div className="grid grid-cols-2 gap-4">
                  {response.products.map((product) => (
                    <ProductPreview
                      key={product.id}
                      imageUrl={product.images[0]}
                      productName={product.title}
                    />
                  ))}
                </div>
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