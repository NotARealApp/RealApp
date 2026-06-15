import { Suspense } from "react";
import DayPlannerApp from "@/components/dayplanner/day-planner-app";

export default function DayPlannerPage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <DayPlannerApp />
    </Suspense>
  );
}
