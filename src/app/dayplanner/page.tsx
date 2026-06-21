import { Suspense } from "react";
import DayPlannerApp from "@/components/dayplanner/day-planner-app";
import { RequireOnboarding } from "@/components/onboarding/require-onboarding";

export default function DayPlannerPage() {
  return (
    <RequireOnboarding>
      <Suspense fallback={<div className="loading">Loading…</div>}>
        <DayPlannerApp />
      </Suspense>
    </RequireOnboarding>
  );
}
