import { Package2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrintifyProductConfig } from "@shared/schema";
import { Separator } from "@/components/ui/separator";

interface ProductStatusCardProps {
  approvedDesignUrl?: string;
  productConfig?: PrintifyProductConfig;
}

export function ProductStatusCard({ approvedDesignUrl, productConfig }: ProductStatusCardProps) {
  const hasProduct = productConfig?.status === "product_selected" && productConfig.blueprint_id;

  return (
    <Card className="w-[300px] p-4 sticky top-4">
      <div className="space-y-4">
        {approvedDesignUrl ? (
          <>
            <h3 className="text-lg font-semibold">Approved Design</h3>
            <AspectRatio ratio={1}>
              <img
                src={approvedDesignUrl}
                alt="Approved design"
                className="rounded-md object-cover w-full h-full"
              />
            </AspectRatio>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Package2 className="h-12 w-12 mb-2" />
            <p>Your product information will show up here</p>
          </div>
        )}

        {/* Show selected product details if available */}
        {hasProduct && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Selected Product</h3>
              {productConfig.print_areas?.front?.src && (
                <AspectRatio ratio={1}>
                  <img
                    src={productConfig.print_areas.front.src}
                    alt={productConfig.title}
                    className="rounded-md object-cover w-full h-full"
                  />
                </AspectRatio>
              )}
              <div className="space-y-2">
                <h4 className="font-medium">{productConfig.title}</h4>
                {productConfig.description && (
                  <p className="text-sm text-muted-foreground">
                    {productConfig.description}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Only show configuration debug panel in development */}
        {process.env.NODE_ENV === 'development' && (approvedDesignUrl || productConfig) && (
          <>
            <Separator className="my-4" />
            <h3 className="text-lg font-semibold">Debug: Product Configuration</h3>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <pre className="text-xs">
                {JSON.stringify(productConfig || {}, null, 2)}
              </pre>
            </ScrollArea>
          </>
        )}
      </div>
    </Card>
  );
}