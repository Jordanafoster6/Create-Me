import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAction: (text: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      label: "Create Product",
      text: "I want a black t-shirt with a cartoonish beagle on it",
    },
    {
      label: "Refine Design",
      text: "make it jumping and a little less cartoonish",
    },
    {
      label: "Approve Design",
      text: "looks good!",
    },
    {
      label: "More Products",
      text: "Can I see more products?",
    },
    {
      label: "Pick Product",
      text: "I like the 3rd product best",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.text)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
