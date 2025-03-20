import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductStatusCardProps {
  designUrl: string | null;
  productData: any;
}

export function ProductStatusCard({ designUrl, productData }: ProductStatusCardProps) {
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
