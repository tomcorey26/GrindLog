import { cn } from "@/lib/utils";

export function FullHeight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 flex flex-col min-h-0", className)}>
      {children}
    </div>
  );
}
