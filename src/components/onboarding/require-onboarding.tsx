"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isOnboarded } from "@/lib/planner-settings";

// Deep-link guard: routes that need a home/office address bounce to "/" (the
// onboarding gate) when the user hasn't set them up yet.
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (isOnboarded()) setOk(true);
    else router.replace("/");
  }, [router]);

  return ok ? <>{children}</> : null;
}
