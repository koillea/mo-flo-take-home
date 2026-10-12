import { Suspense } from "react";
import BuildPage from "./BuildPage";

export default function KnowledgePage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <BuildPage />
    </Suspense>
  );
}
