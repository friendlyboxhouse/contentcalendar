"use client";

import { useEffect, useState } from "react";
import { useContentStore } from "@/store/contentStore";

/** true เมื่อ rehydrate จาก localStorage เสร็จแล้ว (ป้องกันโฟลว์ว่างช่วงแรกของ Dashboard / Calendar ฯลฯ) */
export function useContentStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    typeof window !== "undefined"
      ? useContentStore.persist.hasHydrated()
      : false
  );

  useEffect(() => {
    setHydrated(useContentStore.persist.hasHydrated());
    const unsub = useContentStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );
    return unsub;
  }, []);

  return hydrated;
}
