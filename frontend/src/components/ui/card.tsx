"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const MAX_TILT_DEG = 6;

// Tilt is driven by CSS variables written straight to the element, so pointer movement does not re-render React.
export function Card({ className, onPointerMove, onPointerLeave, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--tilt-x", `${((0.5 - py) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${((px - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    el.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <section
      ref={ref}
      className={cn("tilt-card rounded-2xl border border-border bg-surface p-5", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xs font-medium uppercase tracking-widest text-muted", className)} {...props} />;
}
