import { Suspense } from "react";
import GymApp from "@/components/gym/gym-app";
import { RequireOnboarding } from "@/components/onboarding/require-onboarding";

export default function GymPage() {
  return (
    <RequireOnboarding>
      <Suspense fallback={<div className="loading">Loading…</div>}>
        <GymApp />
      </Suspense>
    </RequireOnboarding>
  );
}
