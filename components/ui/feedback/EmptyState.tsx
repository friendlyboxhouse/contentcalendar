import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/ui/material-icon";

type Props = {
  icon?: string;
  title: string;
  description?: string;
  /** ในการ์ดแคบ / banner เตือนสั้นๆ */
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function EmptyState({
  icon = "inbox",
  title,
  description,
  compact = false,
  className,
  children,
}: Props) {
  const iconSize = compact ? 32 : 44;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center sm:py-14",
        compact && "py-8 sm:py-10",
        className
      )}
    >
      <span aria-hidden className="mb-3 inline-flex rounded-full bg-primary/10 p-3 text-primary/60">
        <MaterialIcon name={icon} size={iconSize} />
      </span>
      <h2
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
