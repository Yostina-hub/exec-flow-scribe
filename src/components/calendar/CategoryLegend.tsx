import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color_hex: string;
  description?: string;
}

interface CategoryLegendProps {
  categories: Category[];
  onAddCategory?: () => void;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryLegend({ 
  categories, 
  onAddCategory,
  onCategoryClick 
}: CategoryLegendProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Categories</CardTitle>
          {onAddCategory && (
            <Button variant="ghost" size="sm" onClick={onAddCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories yet
          </p>
        ) : (
          categories.map(category => (
            <button
              key={category.id}
              onClick={() => onCategoryClick?.(category.id)}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color_hex }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {category.name}
                </div>
                {category.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {category.description}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
