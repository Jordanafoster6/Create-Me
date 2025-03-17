import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAction: (text: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      label: "Create Product",
      text: "I want a black t-shirt with a cartoonish beagle on it"
    },
    {
      label: "Refine Design",
      text: "make it jumping and a little less cartoonish"
    },
    {
      label: "Pick Product",
      text: "I like the 3rd product best"
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
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
