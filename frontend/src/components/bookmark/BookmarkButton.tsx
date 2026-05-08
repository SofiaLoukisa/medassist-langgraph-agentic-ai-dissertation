import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onClick: () => void;
}

export function BookmarkButton({ isBookmarked, onClick }: BookmarkButtonProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick}>
      <Bookmark
        className={cn(
          "h-4 w-4",
          isBookmarked && "fill-primary text-primary"
        )}
      />
    </Button>
  );
}
