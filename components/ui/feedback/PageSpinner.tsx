import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/ui/material-icon";

type Props = {
  /** ข้อความใต้ไอคอน */
  label?: string;
  /** embedded = ในการ์ด/แผง (ไม่กินความสูงเต็มจอ) */
  embedded?: boolean;
  className?: string;
};

export function PageSpinner({
  label = "กำลังโหลด…",
  embedded = false,
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground motion-reduce:transform-none",
        embedded ? "py-10 px-4" : "min-h-[min(50vh,320px)] py-16 px-6",
        className
      )}
    >
      <span aria-hidden className="inline-flex">
        <MaterialIcon
          name="progress_activity"
          size={embedded ? 24 : 32}
          className="shrink-0 animate-spin text-primary motion-reduce:animate-none"
        />
      </span>
      <p className="text-center text-sm">{label}</p>
    </div>
  );
}
