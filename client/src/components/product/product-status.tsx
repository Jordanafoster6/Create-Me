import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ProductStatusProps {
  approvedDesign?: string;
  productData?: any;
}

export function ProductStatus({ approvedDesign, productData }: ProductStatusProps) {
  // Define a complete product creation object template with all possible properties
  const fullProductTemplate = {
    blueprint_id: productData?.blueprint_id || null,
    print_provider_id: productData?.print_provider_id || null,
    title: productData?.title || null,
    description: productData?.description || null,
    print_areas: productData?.print_areas || {},
    blueprint_variant_ids: productData?.blueprint_variant_ids || [],
    print_details: productData?.print_details || {
      format: null,
      sizing_method: null,
      dpi: null,
      print_quality: null
    },
    shipping_info: productData?.shipping_info || {
      handling_time: null,
      shipping_method: null
    },
    metadata: productData?.metadata || {},
    tags: productData?.tags || [],
    options: productData?.options || {},
    variants: productData?.variants || []
  };

  return (
    <Card className="w-80 p-4 sticky top-4">
      {approvedDesign ? (
        <>
          <h3 className="font-medium mb-3">Approved Design</h3>
          <AspectRatio ratio={1}>
            <img
              src={approvedDesign}
              alt="Approved design"
              className="rounded-md object-cover w-full h-full"
            />
          </AspectRatio>
          <div className="mt-4">
            <h3 className="font-medium mb-2">Product Configuration</h3>
            <pre className="text-xs bg-secondary p-2 rounded-md overflow-auto max-h-80">
              {JSON.stringify(fullProductTemplate, null, 2)}
            </pre>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mb-3" />
          <p className="text-center">Your product information will show up here</p>
        </div>
      )}
    </Card>
  );
}
