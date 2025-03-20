import { useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { ProductStatusCard } from "@/components/product/status-card";
import { Card } from "@/components/ui/card";
import { PrintifyProductConfig } from "@shared/schema";

export default function Chat() {
  const [approvedDesignUrl, setApprovedDesignUrl] = useState<string | undefined>();
  const [productConfig, setProductConfig] = useState<PrintifyProductConfig | undefined>();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-[1200px] mx-auto flex gap-4">
        {/* Status Card */}
        <div className="w-[300px]">
          <ProductStatusCard
            approvedDesignUrl={approvedDesignUrl}
            productConfig={productConfig}
          />
        </div>

        {/* Chat Card */}
        <Card className="flex-1 h-[800px] flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-2xl font-bold text-primary">Create.Me</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered product customization
            </p>
          </div>
          <ChatWindow
            onDesignApproved={setApprovedDesignUrl}
            onProductConfigUpdate={setProductConfig}
          />
        </Card>
      </div>
    </div>
  );
}