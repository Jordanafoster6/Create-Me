import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";
import { QuickActions } from "./quick-actions";
import { ChatMessage, OrchestratorResponse, PrintifyProductConfig } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface ChatWindowProps {
  onDesignApproved?: (designUrl: string) => void;
  onProductConfigUpdate?: (config: PrintifyProductConfig) => void;
}

export function ChatWindow({ onDesignApproved, onProductConfigUpdate }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI product customization assistant. How can I help you create something unique today?",
    },
  ]);
  const { toast } = useToast();

  // Initialize empty product config
  useState(() => {
    onProductConfigUpdate?.({
      status: "pending",
      title: "",
      description: "",
      blueprint_id: "",
      print_areas: { front: { src: "" } },
      variant_ids: [],
      metadata: {}
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage.mutate(input);
    setInput("");
  }

  const sendMessage = useMutation({
    mutationFn: async (messageContent: string) => {
      const userMessage: ChatMessage = {
        content: messageContent,
        role: "user",
      };
      setMessages(prev => [...prev, userMessage]);

      const response = await apiRequest("POST", "/api/chat", userMessage);
      const data = await response.json();
      return data;
    },
    onSuccess: (data: ChatMessage) => {
      try {
        // Add the assistant's message to the chat first
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.content
        }]);

        const response = JSON.parse(data.content) as OrchestratorResponse;
        logger.info("Processing chat response", { type: response.type });

        // Handle design approval
        if (response.type === "design_and_products") {
          if (response.status === "selecting") {
            // Update config when design is approved
            const config: PrintifyProductConfig = {
              status: "design_approved",
              title: "",
              description: "",
              blueprint_id: "",
              approved_design_url: response.design.imageUrl,
              print_areas: { front: { src: "" } },
              variant_ids: [],
              metadata: {}
            };
            onProductConfigUpdate?.(config);
            onDesignApproved?.(response.design.imageUrl);
          } else if (response.status === "approved") {
            // Update config when product is selected
            const product = response.products[0];
            const config: PrintifyProductConfig = {
              status: "product_selected",
              approved_design_url: response.design.imageUrl,
              title: product.title,
              description: product.description || "",
              blueprint_id: product.id.toString(),
              print_areas: {
                front: { 
                  src: product.images[0] 
                }
              },
              variant_ids: product.variants?.map(v => v.id) || [],
              metadata: {
                brand: product.brand,
                model: product.model
              }
            };

            logger.info("Updating product config", { config });
            onProductConfigUpdate?.(config);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error("Error processing chat response:", { error: errorMessage });
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

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.map((message, i) => (
          <Message key={i} message={message} />
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
            className="flex-1"
            disabled={sendMessage.isPending}
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