import { useState } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { ChatWindow } from "@/components/chat/chat-window";
import { ProductStatusCard } from "@/components/product/product-status-card";
import { Card } from "@/components/ui/card";
import { useAppSelector } from "@/store";
import { selectCurrentDesign, selectProductDetails } from "@/store/chat-slice";

function ChatContent() {
  const currentDesign = useAppSelector(selectCurrentDesign);
  const productDetails = useAppSelector(selectProductDetails);

  return (
    <div className="min-h-screen bg-background flex gap-4 p-4">
      <div className="flex-none">
        <div className="sticky top-4">
          <ProductStatusCard
            designUrl={currentDesign}
            productData={productDetails}
          />
        </div>
      </div>

      <Card className="flex-1 max-w-4xl h-[800px] flex flex-col">
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

export default function Chat() {
  return (
    <Provider store={store}>
      <ChatContent />
    </Provider>
  );
}