import { Card } from "@/components/ui/card";
import { ChatMessage } from "@shared/schema";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

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
        {message.content.startsWith("Generated design:") ? (
          <div>
            <p className="text-sm mb-2">Here's your generated design:</p>
            <AspectRatio ratio={1}>
              <img
                src={message.content.split(": ")[1]}
                alt="Generated design"
                className="rounded-md object-cover w-full h-full"
              />
            </AspectRatio>
          </div>
        ) : message.content.startsWith("Found ") && message.content.includes("products") ? (
          <div>
            <p className="text-sm">{message.content}</p>
            {/* We can add product grid/list here later */}
          </div>
        ) : (
          <p className="text-sm">{message.content}</p>
        )}
      </Card>
    </div>
  );
}