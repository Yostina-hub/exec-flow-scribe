import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Mic, FileText, Users, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { 
      icon: Calendar, 
      label: 'New Meeting', 
      onClick: () => navigate('/meetings'),
      color: 'bg-primary hover:bg-primary/90'
    },
    { 
      icon: FileText, 
      label: 'New Action', 
      onClick: () => navigate('/actions'),
      color: 'bg-secondary hover:bg-secondary/90'
    },
    { 
      icon: Users, 
      label: 'Team', 
      onClick: () => navigate('/admin'),
      color: 'bg-accent hover:bg-accent/90'
    },
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {/* Action buttons */}
        <div className={cn(
          "flex flex-col-reverse gap-3 mb-3 transition-all duration-300",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none"
        )}>
          {actions.map((action, index) => (
            <Button
              key={index}
              size="lg"
              className={cn(
                "rounded-full shadow-lg h-14 px-6 gap-3",
                action.color,
                "animate-scale-in"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
            >
              <action.icon className="w-5 h-5" />
              <span className="font-medium">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Main FAB button */}
        <Button
          size="lg"
          className={cn(
            "rounded-full shadow-2xl h-16 w-16 transition-all duration-300",
            isOpen ? "rotate-45 bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </Button>
      </div>
    </>
  );
}
