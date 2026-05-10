import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm md:p-5",
        className
      )}
    >
      {children}
    </section>
  );
}
