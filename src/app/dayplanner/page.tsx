import { Suspense } from "react";
import DayPlannerApp from "@/components/dayplanner/DayPlannerApp";

export default function DayPlannerPage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <DayPlannerApp />
    </Suspense>
  );
}
