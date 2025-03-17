import { useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { Card } from "@/components/ui/card";

export default function Chat() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[800px] flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-primary">Create.Me</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered product customization
          </p>
        </div>
        <ChatWindow />
      </Card>
    </div>
  );
}
