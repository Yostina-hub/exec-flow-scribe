import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Video, Network, FileText, CreditCard, HelpCircle, Edit, Wand2, BookOpen, MessageSquare, ListChecks, PieChart, TrendingUp, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      description: 'Generate podcast-style conversation',
      gradient: 'from-purple-500 to-pink-500',
      badge: 'Popular'
    },
    {
      id: 'summary',
      icon: FileText,
      title: 'Smart Summary',
      description: 'AI-powered executive summary',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'qa',
      icon: MessageSquare,
      title: 'Q&A Generator',
      description: 'Generate key questions & answers',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      id: 'timeline',
      icon: TrendingUp,
      title: 'Timeline View',
      description: 'Chronological event mapping',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      id: 'insights',
      icon: Lightbulb,
      title: 'Key Insights',
      description: 'Extract actionable insights',
      gradient: 'from-yellow-500 to-amber-500'
    },
    {
      id: 'mindmap',
      icon: Network,
      title: 'Mind Map',
      description: 'Visual concept mapping',
      gradient: 'from-indigo-500 to-purple-500',
      badge: 'Coming Soon',
      disabled: true
    },
    {
      id: 'flashcards',
      icon: CreditCard,
      title: 'Flashcards',
      description: 'Study aids generation',
      gradient: 'from-pink-500 to-rose-500',
      disabled: true
    },
    {
      id: 'quiz',
      icon: HelpCircle,
      title: 'Quiz',
      description: 'Practice questions',
      gradient: 'from-teal-500 to-cyan-500',
      disabled: true
    },
    {
      id: 'analytics',
      icon: PieChart,
      title: 'Analytics',
      description: 'Content analysis & metrics',
      gradient: 'from-violet-500 to-purple-500',
      disabled: true
    }
  ];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          AI Studio Features
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, index) => (
            <Card
              key={feature.id}
              className={`group relative p-4 space-y-3 transition-all duration-300 animate-fade-in ${
                feature.disabled 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-primary/50'
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => !feature.disabled && onFeatureSelect(feature.id)}
            >
              {feature.badge && (
                <Badge 
                  variant={feature.disabled ? "secondary" : "default"}
                  className="absolute -top-2 -right-2 text-xs shadow-md"
                >
                  {feature.badge}
                </Badge>
              )}
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-md">
            <Wand2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-sm font-semibold text-primary">
              Studio Output Area
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generated content from AI features will appear here. Select sources and choose a feature to get started!
            </p>
            <div className="flex gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                <ListChecks className="h-3 w-3 mr-1" />
                Auto-saved
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Exportable
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Button 
        variant="outline" 
        className="w-full gap-2 hover:bg-accent hover:border-primary/50 transition-all"
        onClick={() => onFeatureSelect('note')}
      >
        <Edit className="h-4 w-4" />
        Add custom note
      </Button>
    </div>
  );
};
