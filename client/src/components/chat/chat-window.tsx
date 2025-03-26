import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";
import { QuickActions } from "./quick-actions";
import {
  ChatMessage,
  OrchestratorResponse,
  PrintifyProductConfig,
  PrintifyBlueprint,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface ChatWindowProps {
  onDesignApproved?: (designUrl: string) => void;
  onProductConfigUpdate?: (config: PrintifyProductConfig) => void;
}

/**
 * ChatWindow Component
 *
 * Handles the main chat interface including:
 * - Message input and submission
 * - Message history display
 * - Quick action buttons
 * - Loading states
 * - Error handling
 * - Design approval and product configuration callbacks
 */
export function ChatWindow({
  onDesignApproved,
  onProductConfigUpdate,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI product customization assistant. How can I help you create something unique today?",
    },
  ]);
  const { toast } = useToast();

  // Message sending mutation
  const sendMessage = useMutation({
    mutationFn: async (messageContent: string) => {
      const userMessage: ChatMessage = {
        content: messageContent,
        role: "user",
      };
      setMessages((prev) => [...prev, userMessage]);

      const response = await apiRequest("POST", "/api/chat", userMessage);
      const data = await response.json();
      return data;
    },
    onSuccess: (data: ChatMessage) => {
      try {
        const response = JSON.parse(data.content) as OrchestratorResponse;
        logger.info("Processing chat response", { type: response.type });

        // Add the assistant's message to the chat
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
          },
        ]);

        // Only trigger design approval when the design is actually approved
        if (
          response.type === "design_and_products" &&
          response.status === "approved"
        ) {
          logger.info("Design approved", {
            imageUrl: response.design.imageUrl,
          });
          onDesignApproved?.(response.design.imageUrl);

          const config: PrintifyProductConfig = {
            status: "selecting_product",
            approved_design_url: response.design.imageUrl,
            title: "",
            description: "",
            print_areas: {
              front: { src: response.design.imageUrl },
            },
            variant_ids: [],
            metadata: {},
          };
          logger.info("Updating product config", { config });
          onProductConfigUpdate?.(config);
        }

        queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Error processing chat response:", {
          error: errorMessage,
        });
        toast({
          title: "Error processing response",
          description: "There was a problem displaying the message",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      logger.error("Failed to send message", { error: error.message });
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProductSelection = (product: PrintifyBlueprint) => {
    const userMessage: ChatMessage = {
      role: "user",
      content: `I choose product with blueprint ID ${product.id}`,
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    console.log("product selection to backend", JSON.stringify(userMessage)); // TODO: Remove this
    // Send to backend
    sendMessage.mutate(JSON.stringify(userMessage));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage.mutate(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.map((message, i) => (
          <Message
            key={i}
            message={message}
            onUserSelectProduct={handleProductSelection}
          />
        ))}
        {sendMessage.isPending && (
          <div className="flex justify-start mb-4">
            <div className="bg-secondary rounded-lg p-4">
              <div className="animate-pulse">Thinking...</div>
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            aria-label="Chat message input"
            className="flex-1"
            disabled={sendMessage.isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={sendMessage.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {sendMessage.isPending ? "Sending..." : "Send"}
          </Button>
        </form>
        <QuickActions onAction={setInput} />
      </div>
    </div>
  );
}
