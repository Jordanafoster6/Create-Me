import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Package } from "lucide-react";

interface PreviewProps {
  imageUrl: string;
  productName: string;
}

export function ProductPreview({ imageUrl, productName }: PreviewProps) {
  return (
    <Card className="overflow-hidden">
      <AspectRatio ratio={1}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </AspectRatio>
      <div className="p-4">
        <h3 className="font-medium">{productName}</h3>
      </div>
    </Card>
  );
}