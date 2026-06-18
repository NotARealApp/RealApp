"use client";

import { useState } from "react";
import { SlideToggle } from "./slide-toggle";
import { Button } from "@/components/ui/button";
import { EditIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/cn";
import type { PlanMode, PlanTime } from "@/lib/dayplanner/logic";

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  value: PlanTime;
  onChange: (v: PlanTime) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

// Collapsible "Plan a time": override live routing with a leave-at / arrive-by
// time. "Now" is the default — selecting it resets to live instantly. Leave/
// arrive edits are a draft, committed (and refetched) only via "Show routes".
export function PlanTimePicker({ value, onChange, t }: Props) {
  const active = value.mode !== "now" && !!value.time;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PlanMode>(value.mode);
  const [time, setTime] = useState(value.time || nowHHMM());

  const openEditor = () => {
    // Seed the draft from the applied plan (e.g. one restored from a previous
    // session) so reopening reflects it.
    setMode(value.mode);
    setTime(value.time || nowHHMM());
    setOpen(true);
  };

  const selectMode = (m: PlanMode) => {
    setMode(m);
    if (m === "now") {
      onChange({ mode: "now", time: "" }); // instant reset to live
      setOpen(false);
    } else if (!time) {
      setTime(nowHHMM());
    }
  };

  const apply = () => {
    onChange({ mode, time });
    setOpen(false); // collapse to free space; collapsed row shows the active plan
  };

  const dirty = !(value.mode === mode && value.time === time);

  // Collapsed trigger and the editor panel cross-fade as the wrapper's
  // grid-rows animates 0fr<->1fr (the height-auto-without-JS trick). The panel
  // stays mounted so it can transition out; `inert` drops it from tab + a11y
  // while collapsed.
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openEditor}
          className="mb-3 flex w-full items-center gap-1.5 rounded-xl border border-outline bg-surface-container px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <span className="flex-1 text-center">
            🕒 {active ? `${t(value.mode === "arrive" ? "dp.arriveBy" : "dp.leaveBy")} ${value.time}` : t("dp.planTime")}
          </span>
          <EditIcon className="size-3.5 text-on-surface-variant/70" />
        </button>
      )}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-[250ms] ease-out",
          open ? "mb-3 grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          inert={!open || undefined}
          className={cn(
            "overflow-hidden transition-opacity duration-200 ease-out",
            open ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="rounded-xl border border-outline bg-surface-container p-3">
            <SlideToggle
              fullWidth
              ariaLabel={t("dp.planTime")}
              value={mode}
              onChange={selectMode}
              options={[
                { value: "now", label: t("dp.useNow") },
                { value: "leave", label: t("dp.leaveBy") },
                { value: "arrive", label: t("dp.arriveBy") },
              ]}
            />
            {mode !== "now" && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="time"
                  aria-label={t("dp.planTime")}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-9 flex-1 rounded-full border border-outline bg-surface-high px-3 text-xs text-on-surface"
                />
                <Button className="h-9 min-h-0 shrink-0 px-4 text-xs" disabled={!dirty} onClick={apply}>
                  {t("dp.showRoutes")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
