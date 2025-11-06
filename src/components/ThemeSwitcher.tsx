import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-background">
        <DropdownMenuItem
          onClick={() => setTheme('default')}
          className={theme === 'default' ? 'bg-accent' : ''}
        >
          Default Theme
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('ethio-telecom')}
          className={theme === 'ethio-telecom' ? 'bg-accent' : ''}
        >
          Ethio Telecom
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
