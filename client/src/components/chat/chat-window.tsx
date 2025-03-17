import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";
import { ChatMessage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatResponse {
  type: string;
  message?: string;
  imageUrl?: string;
  products?: any[];
  status?: string;
}

export function ChatWindow() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        content,
        role: "user"
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Parse the assistant's response if it's JSON
      let assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.content
      };

      try {
        const parsedContent = JSON.parse(data.content) as ChatResponse;
        if (parsedContent.type === "chat" && parsedContent.message) {
          assistantMessage.content = parsedContent.message;
        } else if (parsedContent.type === "design" && parsedContent.imageUrl) {
          assistantMessage.content = `Generated design: ${parsedContent.imageUrl}`;
        } else if (parsedContent.type === "product_search" && parsedContent.products) {
          assistantMessage.content = `Found ${parsedContent.products.length} products.`;
        }
      } catch (error) {
        console.error("Failed to parse assistant response:", error);
      }

      setMessages(prev => [...prev, 
        { role: "user", content: input },
        assistantMessage
      ]);
      queryClient.invalidateQueries({ queryKey: ['/api/chat'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

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

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
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
        </div>
      </form>
    </div>
  );
}