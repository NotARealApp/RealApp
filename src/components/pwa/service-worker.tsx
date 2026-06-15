"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/context/I18nProvider";
import { Button } from "@/components/ui/button";

// Registers /sw.js and shows a refresh toast when a new worker is waiting.
// Auto-reloads once the new worker takes control (only on a real update, not
// the first install).
export function ServiceWorker() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reloading = false;
    const hadController = !!navigator.serviceWorker.controller;
    const onChange = () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);

    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker
      .register(`${base}/sw.js`)
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) setWaiting(nw);
          });
        });
      })
      .catch(() => {});

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-outline bg-surface-container p-4 shadow-elev-2"
    >
      <span className="flex-1 text-sm">{t("dp.newVersion")}</span>
      <Button
        variant="soft"
        className="min-h-9 shrink-0 px-4 py-2 text-xs"
        onClick={() => waiting.postMessage("SKIP_WAITING")}
      >
        {t("dp.refresh")}
      </Button>
    </div>
  );
}
