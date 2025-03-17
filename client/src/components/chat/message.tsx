import { Card } from "@/components/ui/card";
import { ChatMessage } from "@shared/schema";
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

  if (!isUser && message.content) {
    try {
      const jsonContent = JSON.parse(message.content);
      if (jsonContent.type === "design" && jsonContent.imageUrl) {
        contentType = "image";
        parsedContent = jsonContent.imageUrl;
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
        {contentType === "image" ? (
          <div className="space-y-2">
            <p className="text-sm mb-2">Here's your generated design:</p>
            <AspectRatio ratio={1}>
              <img
                src={parsedContent}
                alt="Generated design"
                className="rounded-md object-cover w-full h-full"
              />
            </AspectRatio>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{parsedContent}</p>
        )}
      </Card>
    </div>
  );
}