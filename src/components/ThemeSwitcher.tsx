import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Palette, Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={`relative transition-all ${
            theme === 'ethio-telecom' 
              ? 'border-[#8DC63F]/30 bg-gradient-to-br from-[#8DC63F]/10 to-[#0072BC]/10 hover:from-[#8DC63F]/20 hover:to-[#0072BC]/20' 
              : 'hover:bg-accent/50'
          }`}
        >
          <Palette className={`h-5 w-5 ${theme === 'ethio-telecom' ? 'text-[#8DC63F]' : ''}`} />
          {theme === 'ethio-telecom' && (
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#8DC63F] animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50 bg-background/95 backdrop-blur-xl">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Theme Selection</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => setTheme('default')}
          className={`cursor-pointer py-3 ${
            theme === 'default' 
              ? 'bg-gradient-to-r from-primary/10 to-secondary/10 font-medium' 
              : 'hover:bg-accent/50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary shadow-md" />
              <div>
                <div className="font-semibold">Default Theme</div>
                <div className="text-xs text-muted-foreground">Original design</div>
              </div>
            </div>
            {theme === 'default' && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('ethio-telecom')}
          className={`cursor-pointer py-3 ${
            theme === 'ethio-telecom' 
              ? 'bg-gradient-to-r from-[#8DC63F]/10 to-[#0072BC]/10 font-medium' 
              : 'hover:bg-accent/50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#8DC63F] to-[#0072BC] shadow-md" />
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  Ethio Telecom
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#8DC63F]/20 text-[#8DC63F] border-[#8DC63F]/30">
                    Brand
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">Corporate branding</div>
              </div>
            </div>
            {theme === 'ethio-telecom' && (
              <Check className="h-4 w-4 text-[#8DC63F]" />
            )}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
