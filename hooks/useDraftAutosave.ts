"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UseDraftAutosaveOpts<T> {
  /** Stable key per draft instance (e.g. brief id, or "new") */
  key: string;
  /** Current draft value (any serializable shape) */
  value: T | null;
  /** Debounce ms before writing to storage */
  debounceMs?: number;
  /** Disable auto-save (e.g., viewer mode) */
  disabled?: boolean;
}

const STORAGE_PREFIX = "cp:draft:";

export function useDraftAutosave<T>({
  key,
  value,
  debounceMs = 1000,
  disabled = false,
}: UseDraftAutosaveOpts<T>) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const firstWriteRef = useRef(true);

  useEffect(() => {
    firstWriteRef.current = true;
  }, [key]);

  useEffect(() => {
    if (disabled || value == null || typeof window === "undefined") return;
    // Skip the very first effect run (initial load)
    if (firstWriteRef.current) {
      firstWriteRef.current = false;
      return;
    }
    setHasUnsaved(true);
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_PREFIX + key,
          JSON.stringify({ value, ts: Date.now() })
        );
        setSavedAt(new Date());
        setHasUnsaved(false);
      } catch {
        toast.error(
          "บันทึกร่างในเบราว์เซอร์ไม่ได้ (พื้นที่เต็มหรือถูกบล็อก) — พิมพ์ต่อแล้วบันทึกบรีฟ หรือล้างข้อมูลไซต์"
        );
      }
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [key, value, debounceMs, disabled]);

  const loadDraft = useCallback((): { value: T; ts: number } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_PREFIX + key);
    setSavedAt(null);
    setHasUnsaved(false);
  }, [key]);

  return { savedAt, hasUnsaved, loadDraft, clearDraft };
}
