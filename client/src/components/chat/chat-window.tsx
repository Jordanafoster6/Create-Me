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
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Hello! I'm your AI product customization assistant. How can I help you create something unique today?"
  }]);
  const { toast } = useToast();

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const userMessage: ChatMessage = {
        content,
        role: "user"
      };
      const response = await apiRequest("POST", "/api/chat", userMessage);
      return response.json();
    },
    onSuccess: (data: ChatMessage) => {
      try {
        // Handle assistant response
        let assistantContent = data.content;
        try {
          const parsedResponse = JSON.parse(data.content) as ChatResponse;
          if (parsedResponse.type === "chat" && parsedResponse.message) {
            assistantContent = parsedResponse.message;
          }
        } catch (error) {
          console.warn("Could not parse assistant response as JSON:", error);
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: assistantContent
        };

        setMessages(prev => [...prev, 
          { role: "user", content: input },
          assistantMessage
        ]);

        queryClient.invalidateQueries({ queryKey: ['/api/chat'] });
      } catch (error) {
        console.error("Error processing chat response:", error);
        toast({
          title: "Error processing response",
          description: "There was a problem displaying the message",
          variant: "destructive"
        });
      }
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