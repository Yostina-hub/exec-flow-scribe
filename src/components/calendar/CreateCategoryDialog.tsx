import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PRESET_COLORS = [
  { name: "Board", hex: "#1e40af" },
  { name: "Trading", hex: "#059669" },
  { name: "PMO", hex: "#dc2626" },
  { name: "Revenue Council", hex: "#7c3aed" },
  { name: "External", hex: "#ea580c" },
  { name: "Review", hex: "#0891b2" },
  { name: "Strategy", hex: "#be185d" },
  { name: "Operations", hex: "#ca8a04" },
];

interface CreateCategoryDialogProps {
  onCategoryCreated?: () => void;
}

export function CreateCategoryDialog({ onCategoryCreated }: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color_hex: PRESET_COLORS[0].hex,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("event_categories")
        .insert({
          name: formData.name,
          description: formData.description,
          color_hex: formData.color_hex,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Category created successfully");
      setOpen(false);
      setFormData({ name: "", description: "", color_hex: PRESET_COLORS[0].hex });
      onCategoryCreated?.();
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Event Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Board Meeting, PMO Review"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, color_hex: color.hex })}
                  className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full border-2"
                    style={{
                      backgroundColor: color.hex,
                      borderColor: formData.color_hex === color.hex ? "hsl(var(--primary))" : "transparent"
                    }}
                  />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="custom-color" className="text-sm">Custom:</Label>
              <Input
                id="custom-color"
                type="color"
                value={formData.color_hex}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                className="w-20 h-10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
