import { cn } from "@/lib/utils";

type Props = {
  name: string;
  className?: string;
  filled?: boolean;
  /** Optical size in px (Material Symbols variable font) */
  size?: number;
  label?: string;
};

export function MaterialIcon({
  name,
  className,
  filled = false,
  size = 20,
  label,
}: Props) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "material-symbols-outlined inline-flex select-none items-center justify-center align-middle",
        className
      )}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {name}
    </span>
  );
}
