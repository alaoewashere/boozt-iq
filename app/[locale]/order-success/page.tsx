import { Suspense } from "react";
import { OrderSuccessClient } from "./OrderSuccessClient";

function OrderSuccessFallback() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-[var(--text-muted)]">
      Loading…
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderSuccessFallback />}>
      <OrderSuccessClient />
    </Suspense>
  );
}
