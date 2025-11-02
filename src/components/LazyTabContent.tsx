import { ReactNode, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LazyTabContentProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const LoadingFallback = () => (
  <Card>
    <CardContent className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </CardContent>
  </Card>
);

export const LazyTabContent = ({ children, fallback }: LazyTabContentProps) => {
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  );
};
