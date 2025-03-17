import { Card } from "@/components/ui/card";
import { ChatMessage, DesignAnalysis, DesignResponse } from "@shared/schema";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  // Try to parse the content as JSON if it's from assistant
  let parsedContent = message.content;
  let contentType = "text";
  let analysis: DesignAnalysis | null = null;

  if (!isUser && message.content) {
    try {
      const jsonContent = JSON.parse(message.content);
      if (jsonContent.type === "design" && jsonContent.imageUrl) {
        contentType = "design";
        parsedContent = jsonContent.imageUrl;
        try {
          analysis = JSON.parse(jsonContent.analysis) as DesignAnalysis;
        } catch (error) {
          console.warn("Could not parse analysis:", error);
        }
      } else if (jsonContent.type === "chat" && jsonContent.message) {
        parsedContent = jsonContent.message;
      }
    } catch (error) {
      // If parsing fails, use the content as is
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
        {contentType === "design" ? (
          <div className="space-y-4">
            <p className="text-sm mb-2">Here's your generated design:</p>
            <AspectRatio ratio={1}>
              <img
                src={parsedContent}
                alt="Generated design"
                className="rounded-md object-cover w-full h-full"
              />
            </AspectRatio>
            {analysis && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Design Analysis:</h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.imageAnalysis.description}
                </p>
                {analysis.suggestions && (
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