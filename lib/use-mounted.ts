"use client";

import { useEffect, useState } from "react";

/** `true` after the first client paint — avoids SSR vs persist-store hydration mismatches. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
