import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";
import { ChatMessage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function ChatWindow() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        content,
        role: "user"
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ['/api/chat'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      content: input,
      role: "user"
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessage.mutate(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.map((message, i) => (
          <Message key={i} message={message} />
        ))}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button 
            type="submit"
            disabled={sendMessage.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}