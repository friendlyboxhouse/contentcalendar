"use client";

import { useEffect, useState } from "react";
import { getCountdown } from "@/lib/utils";

export function useCountdown(targetDate: Date, tickMs = 60_000) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs, targetDate]);

  return getCountdown(targetDate);
}
