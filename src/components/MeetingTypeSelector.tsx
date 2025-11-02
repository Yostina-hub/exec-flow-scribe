import { Video, Globe, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MeetingTypeSelectorProps {
  value: "video_conference" | "virtual_room" | "standard";
  onChange: (type: "video_conference" | "virtual_room" | "standard") => void;
}

export const MeetingTypeSelector = ({ value, onChange }: MeetingTypeSelectorProps) => {
  const types = [
    {
      id: "video_conference" as const,
      title: "Video Conference",
      description: "External video call (Google Meet, TMeet)",
      icon: Video,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
      borderColor: "border-blue-500/50",
    },
    {
      id: "virtual_room" as const,
      title: "Virtual 3D Room",
      description: "Immersive 3D meeting experience",
      icon: Globe,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
      borderColor: "border-purple-500/50",
    },
    {
      id: "standard" as const,
      title: "Standard Meeting",
      description: "In-person or async meeting page",
      icon: Calendar,
      color: "text-green-500",
      bgColor: "bg-green-500/10 hover:bg-green-500/20",
      borderColor: "border-green-500/50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {types.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.id;
        
        return (
          <Card
            key={type.id}
            className={cn(
              "cursor-pointer transition-all duration-200 border-2",
              isSelected 
                ? `${type.borderColor} ${type.bgColor.split("hover:")[0]}` 
                : "border-border hover:border-primary/50",
              type.bgColor.includes("hover:") && !isSelected && "hover:bg-accent"
            )}
            onClick={() => onChange(type.id)}
          >
            <CardContent className="p-6 text-center">
              <div className={cn("mb-4 flex justify-center", type.color)}>
                <Icon className="h-12 w-12" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
