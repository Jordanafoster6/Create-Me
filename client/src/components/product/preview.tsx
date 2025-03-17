import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface PreviewProps {
  imageUrl: string;
  productName: string;
}

export function ProductPreview({ imageUrl, productName }: PreviewProps) {
  return (
    <Card className="overflow-hidden">
      <AspectRatio ratio={1}>
        <img
          src={imageUrl}
          alt={productName}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      <div className="p-4">
        <h3 className="font-medium">{productName}</h3>
      </div>
    </Card>
  );
}
