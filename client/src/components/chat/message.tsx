import { Card } from "@/components/ui/card";
import { ChatMessage, DesignAnalysis } from "@shared/schema";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ProductPreview } from "@/components/product/preview";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  let parsedContent = message.content;
  let contentType = "text";
  let analysis: DesignAnalysis | null = null;
  let products = null;
  let jsonContent: any = null;
  let designUrl: string | null = null;

  if (!isUser) {
    try {
      jsonContent = JSON.parse(message.content);
      console.log('Parsed message content:', jsonContent);

      if (jsonContent.type === "design_and_products") {
        contentType = "design_and_products";
        parsedContent = jsonContent.message || "";
        designUrl = jsonContent.design?.imageUrl;
        products = jsonContent.products;
      } else if (jsonContent.type === "design") {
        contentType = "design";
        designUrl = jsonContent.imageUrl;
        parsedContent = jsonContent.message || "";
        if (jsonContent.analysis) {
          try {
            analysis = JSON.parse(jsonContent.analysis);
          } catch (error) {
            console.warn("Could not parse design analysis:", error);
          }
        }
      } else if (jsonContent.type === "chat") {
        parsedContent = jsonContent.message || "";
      }
    } catch (error) {
      console.debug("Message is not JSON:", message.content);
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
        {contentType === "design_and_products" ? (
          <div className="space-y-4">
            {parsedContent && <p className="text-sm mb-2">{parsedContent}</p>}
            {designUrl && (
              <>
                <p className="text-sm mb-2">Here's your initial design:</p>
                <AspectRatio ratio={1}>
                  <img
                    src={designUrl}
                    alt="Generated design"
                    className="rounded-md object-cover w-full h-full"
                  />
                </AspectRatio>
                {analysis?.imageAnalysis && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Design Analysis:</h4>
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
                  </div>
                )}
              </>
            )}
            {products && products.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Available Products:</h4>
                <div className="grid grid-cols-2 gap-4">
                  {products.map((product: any, index: number) => (
                    <ProductPreview
                      key={index}
                      imageUrl={product.images?.[0] || ''}
                      productName={product.title || `Product ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : contentType === "design" ? (
          <div className="space-y-4">
            {parsedContent && <p className="text-sm mb-2">{parsedContent}</p>}
            {designUrl && (
              <AspectRatio ratio={1}>
                <img
                  src={designUrl}
                  alt="Generated design"
                  className="rounded-md object-cover w-full h-full"
                />
              </AspectRatio>
            )}
            {analysis?.imageAnalysis && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Design Analysis:</h4>
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
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{parsedContent}</p>
        )}
      </Card>
    </div>
  );
}