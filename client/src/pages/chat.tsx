import { useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { Card } from "@/components/ui/card";
import { ProductStatus } from "@/components/product/product-status";

export default function Chat() {
  const [approvedDesign, setApprovedDesign] = useState<string | undefined>();
  const [productData, setProductData] = useState<any | undefined>();

  return (
    <div className="min-h-screen bg-background flex gap-4 p-4">
      <ProductStatus 
        approvedDesign={approvedDesign}
        productData={productData}
      />
      <Card className="flex-1 max-w-4xl h-[800px] flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-primary">Create.Me</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered product customization
          </p>
        </div>
        <ChatWindow 
          onDesignApproved={(designUrl) => setApprovedDesign(designUrl)}
          onProductUpdate={(data) => setProductData(data)}
        />
      </Card>
    </div>
  );
}