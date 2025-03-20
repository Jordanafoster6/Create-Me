import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ProductStatusCardProps {
  designUrl: string | null;
  productData: any;
  selectedProduct?: {
    title?: string;
    description?: string;
    images?: string[];
  };
}

export function ProductStatusCard({ designUrl, productData, selectedProduct }: ProductStatusCardProps) {
  return (
    <Card className="w-[350px] p-4 flex flex-col gap-4">
      <h3 className="font-semibold">Product Status</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Current Design</h4>
          <AspectRatio ratio={1}>
            {designUrl ? (
              <img
                src={designUrl}
                alt="Current design"
                className="rounded-md object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                No design yet
              </div>
            )}
          </AspectRatio>
        </div>

        {selectedProduct && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Selected Product</h4>
              <div className="space-y-3">
                {selectedProduct.images?.[0] && (
                  <AspectRatio ratio={1}>
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.title}
                      className="rounded-md object-cover w-full h-full"
                    />
                  </AspectRatio>
                )}
                {selectedProduct.title && (
                  <h5 className="font-medium text-sm">{selectedProduct.title}</h5>
                )}
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.description}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />
        <div>
          <h4 className="text-sm font-medium mb-2">Product Details</h4>
          <ScrollArea className="h-[200px] w-full rounded-md border p-2">
            <pre className="text-xs whitespace-pre-wrap break-words">
              {JSON.stringify(productData || {}, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}