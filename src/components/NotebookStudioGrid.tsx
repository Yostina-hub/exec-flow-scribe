import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Video, Network, FileText, CreditCard, HelpCircle, Edit, Wand2 } from "lucide-react";

interface NotebookStudioGridProps {
  sourceIds: string[];
  notebookId: string;
  onFeatureSelect: (feature: string) => void;
}

export const NotebookStudioGrid = ({ sourceIds, notebookId, onFeatureSelect }: NotebookStudioGridProps) => {
  const features = [
    {
      id: 'audio',
      icon: Radio,
      title: 'Audio Overview',
      description: 'Generate a podcast-style conversation',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'video',
      icon: Video,
      title: 'Video Overview',
      description: 'Coming soon',
      gradient: 'from-blue-500 to-cyan-500',
      disabled: true
    },
    {
      id: 'mindmap',
      icon: Network,
      title: 'Mind Map',
      description: 'Generate an AI mind map based on your sources',
      gradient: 'from-green-500 to-emerald-500',
      disabled: true
    },
    {
      id: 'reports',
      icon: FileText,
      title: 'Reports',
      description: 'Export structured reports',
      gradient: 'from-orange-500 to-red-500',
      disabled: true
    },
    {
      id: 'flashcards',
      icon: CreditCard,
      title: 'Flashcards',
      description: 'Create study flashcards',
      gradient: 'from-indigo-500 to-purple-500',
      disabled: true
    },
    {
      id: 'quiz',
      icon: HelpCircle,
      title: 'Quiz',
      description: 'Generate practice questions',
      gradient: 'from-pink-500 to-rose-500',
      disabled: true
    }
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature) => (
          <Card
            key={feature.id}
            className={`p-4 space-y-3 transition-all hover:shadow-lg ${
              feature.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:border-primary'
            }`}
            onClick={() => !feature.disabled && onFeatureSelect(feature.id)}
          >
            <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
              <feature.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {feature.description}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Wand2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">
              Studio output will be saved here.
            </p>
            <p className="text-xs text-muted-foreground">
              After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
            </p>
          </div>
        </div>
      </Card>

      <Button 
        variant="outline" 
        className="w-full gap-2"
        onClick={() => onFeatureSelect('note')}
      >
        <Edit className="h-4 w-4" />
        Add note
      </Button>
    </div>
  );
};
