"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  src?: string | null;
  alt?: string;
  fallback: string;
  colorClassName?: string;
};

export function Avatar({
  src,
  alt,
  fallback,
  className,
  colorClassName,
  ...props
}: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold uppercase text-muted-foreground",
        colorClassName,
        className
      )}
      {...props}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={alt || "avatar"}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          width={80}
          height={80}
        />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}
