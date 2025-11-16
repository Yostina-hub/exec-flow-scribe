import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const NotebookSkeleton = () => {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-5">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Sources Panel */}
        <Card className="col-span-3 border border-border/50 rounded-2xl bg-card/60 backdrop-blur-sm shadow-xl">
          <CardHeader className="px-5 py-6 border-b">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/50 space-y-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Center Panel */}
        <div className="col-span-5 flex flex-col gap-4">
          <Card className="flex-1 border border-border/50 rounded-2xl bg-card/60 backdrop-blur-sm shadow-xl">
            <CardHeader className="px-6 py-5 border-b">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
          <Card className="h-80 border border-border/50 rounded-2xl bg-card/60 backdrop-blur-sm shadow-xl">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-full" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <Card className="col-span-4 border border-border/50 rounded-2xl bg-card/60 backdrop-blur-sm shadow-xl">
          <CardHeader className="px-5 py-5 border-b">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-5 rounded-xl border border-border/50 space-y-3 animate-pulse">
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
