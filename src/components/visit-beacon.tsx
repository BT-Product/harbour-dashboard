"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordPageView } from "@/lib/actions/visits";

/**
 * Records a client page view once per path per mount. Rendered from the
 * client dashboard layout, so it covers every dashboard route including
 * client-side navigations between them.
 */
export function VisitBeacon() {
  const pathname = usePathname();
  const lastRecorded = useRef<string | null>(null);

  useEffect(() => {
    // React runs effects twice in dev Strict Mode, and a re-render for any
    // other reason shouldn't double-count either.
    if (lastRecorded.current === pathname) return;
    lastRecorded.current = pathname;
    void recordPageView(pathname);
  }, [pathname]);

  return null;
}
