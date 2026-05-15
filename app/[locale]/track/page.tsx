import { Suspense } from "react";
import { TrackPageClient } from "./TrackPageClient";

function TrackFallback() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center font-body text-sm text-[#9A7F7A]">
      Loading…
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackFallback />}>
      <TrackPageClient />
    </Suspense>
  );
}
