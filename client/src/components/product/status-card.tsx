import { Package2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrintifyProductConfig } from "@shared/schema";

interface ProductStatusCardProps {
  approvedDesignUrl?: string;
  productConfig?: PrintifyProductConfig;
}

/**
 * ProductStatusCard Component
 * 
 * Displays a floating card with:
 * - Approved design preview (if available)
 * - Current product configuration as JSON
 * - Placeholder state when no data is available
 */
export function ProductStatusCard({ approvedDesignUrl, productConfig }: ProductStatusCardProps) {
  const emptyConfig: PrintifyProductConfig = {
    title: "",
    description: "",
    blueprint_id: "",
    print_areas: {
      front: { src: "" }
    },
    variant_ids: [],
    status: "pending",
    approved_design_url: "",
    metadata: {}
  };

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

        {(approvedDesignUrl || productConfig) && (
          <>
            <h3 className="text-lg font-semibold">Product Configuration</h3>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <pre className="text-xs">
                {JSON.stringify(productConfig || emptyConfig, null, 2)}
              </pre>
            </ScrollArea>
          </>
        )}
      </div>
    </Card>
  );
}