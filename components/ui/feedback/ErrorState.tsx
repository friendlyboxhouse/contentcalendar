import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";

type Props = {
  title?: string;
  message: string;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
};

export function ErrorState({
  title = "เกิดข้อผิดพลาด",
  message,
  className,
  onRetry,
  retryLabel = "ลองอีกครั้ง",
  children,
}: Props) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center sm:py-12",
        className
      )}
    >
      <span aria-hidden className="mb-3 inline-flex text-destructive">
        <MaterialIcon name="error_outline" size={40} />
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {children ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>
      ) : null}
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          className="mt-6 gap-2"
          onClick={onRetry}
        >
          <MaterialIcon name="refresh" size={18} />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
