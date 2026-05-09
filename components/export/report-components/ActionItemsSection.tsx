"use client";

interface ActionItemsSectionProps {
  items: string[];
  /** Decorative numbers grey style per spec */
  variant?: "numbered";
}

export function ActionItemsSection({
  items,
  variant = "numbered",
}: ActionItemsSectionProps) {
  if (!items.length) return null;

  return (
    <ul className="space-y-0">
      {items.map((text, i) => (
        <li
          key={i}
          className="flex gap-4 border-b border-gray-100 py-3 last:border-0"
        >
          {variant === "numbered" && (
            <span className="w-10 shrink-0 text-[28px] font-bold leading-none text-gray-200">
              {i + 1}
            </span>
          )}
          <span className="text-[14px] leading-relaxed text-gray-800">{text}</span>
        </li>
      ))}
    </ul>
  );
}
