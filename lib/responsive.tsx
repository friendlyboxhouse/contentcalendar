import type { ReactNode } from "react";

type SlotProps = {
  children: ReactNode;
  className?: string;
};

function join(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

export function RailWide({ children, className }: SlotProps) {
  return <span className={join("hidden xl:inline", className)}>{children}</span>;
}

export function RailNarrow({ children, className }: SlotProps) {
  return <span className={join("hidden md:inline xl:hidden", className)}>{children}</span>;
}

export function MobileOnly({ children, className }: SlotProps) {
  return <span className={join("md:hidden", className)}>{children}</span>;
}

export function DesktopOnly({ children, className }: SlotProps) {
  return <span className={join("hidden md:inline", className)}>{children}</span>;
}
