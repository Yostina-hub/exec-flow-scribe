import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const skeletonVariants = cva(
  "relative overflow-hidden rounded-md bg-muted/50 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent",
  {
    variants: {
      speed: {
        slow: "before:animate-shimmer-slow",
        normal: "before:animate-shimmer",
        fast: "before:animate-shimmer-fast",
      },
    },
    defaultVariants: {
      speed: "normal",
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, speed, ...props }: SkeletonProps) {
  return (
    <div 
      className={cn(skeletonVariants({ speed }), className)} 
      {...props} 
    />
  );
}

export { Skeleton };
