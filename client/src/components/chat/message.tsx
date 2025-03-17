import { Card } from "@/components/ui/card";
import { ChatMessage, DesignAnalysis, DesignResponse } from "@shared/schema";
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

  if (!isUser && message.content) {
    try {
      jsonContent = JSON.parse(message.content);
      if (jsonContent.type === "design_and_products") {
        contentType = "design_and_products";
        parsedContent = jsonContent.message;
        if (jsonContent.design?.analysis) {
          try {
            analysis = JSON.parse(jsonContent.design.analysis) as DesignAnalysis;
          } catch (error) {
            console.warn("Could not parse design analysis:", error);
          }
        }
        products = jsonContent.products;
      } else if (jsonContent.type === "design") {
        contentType = "design";
        parsedContent = jsonContent.imageUrl;
        if (jsonContent.analysis) {
          try {
            analysis = JSON.parse(jsonContent.analysis) as DesignAnalysis;
          } catch (error) {
            console.warn("Could not parse analysis:", error);
          }
        }
      } else if (jsonContent.type === "product_configured") {
        contentType = "product_configured";
        parsedContent = jsonContent.message;
      } else if (jsonContent.type === "chat" && jsonContent.message) {
        parsedContent = jsonContent.message;
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
            <p className="text-sm mb-2">{parsedContent}</p>
            {jsonContent?.design && (
              <>
                <p className="text-sm mb-2">Here's your initial design:</p>
                <AspectRatio ratio={1}>
                  <img
                    src={jsonContent.design.imageUrl}
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
                      imageUrl={product.images[0]}
                      productName={product.title}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : contentType === "design" ? (
          <div className="space-y-4">
            <p className="text-sm mb-2">Here's your generated design:</p>
            <AspectRatio ratio={1}>
              <img
                src={parsedContent}
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
          </div>
        ) : contentType === "product_configured" ? (
          <div className="space-y-4">
            <p className="text-sm text-primary">{parsedContent}</p>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{parsedContent}</p>
        )}
      </Card>
    </div>
  );
}