"use client";

import { useEffect, useState } from "react";
import { fetchOccupancy, occLevel, type Occupancy, type OccLevel } from "@/lib/gym";
import { cn } from "@/lib/cn";

const OCC_BAR: Record<OccLevel, string> = {
  low: "bg-status-good",
  med: "bg-status-warn",
  high: "bg-status-bad",
};
const OCC_TEXT: Record<OccLevel, string> = {
  low: "text-status-good",
  med: "text-status-warn",
  high: "text-status-bad",
};

// Live gym occupancy for a McFit/RSG studio. Fetches on mount; stays silent
// (renders nothing) when no proxy is configured, so callers can drop it in
// unconditionally. Shows the current load as a bar + a today-by-hour mini chart
// so you can see whether now is a good time or whether to wait out the rush.
export function GymOccupancy({
  studioId,
  t,
}: {
  studioId: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [state, setState] = useState<"loading" | "error" | "hidden" | Occupancy>("loading");
  // Tapped hour in the mini chart — drives the readout so mobile (no hover) can
  // still read each bar's value. null = show the current hour.
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetchOccupancy(studioId)
      .then((o) => alive && setState(o ?? "hidden"))
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [studioId]);

  if (state === "hidden") return null;

  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-medium text-on-surface-variant">{t("gym.occupancy")}</h3>
      {state === "loading" ? (
        <div className="h-2 w-full animate-pulse rounded-full bg-surface-high" />
      ) : state === "error" ? (
        <p className="text-sm text-on-surface-variant">{t("gym.occErr")}</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className={cn("text-2xl font-bold", OCC_TEXT[state.level])}>{state.current}%</span>
            <span className={cn("text-sm font-semibold", OCC_TEXT[state.level])}>
              {t(`gym.${state.level}`)}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-high">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500 ease-out", OCC_BAR[state.level])}
              style={{ width: `${Math.max(2, state.current)}%` }}
            />
          </div>

          {/* Today by hour, opening hours only (06:00–23:00) — each bar coloured by
              its own load (quiet mornings → busy evenings reads as a heatmap). Past
              hours are dimmed hard; the current hour is ringed; future hours are
              McFit's forecast, dimmed lightly so "predicted" reads at a glance. */}
          {(() => {
            const day = state.hours.filter((h) => h.hour >= 6 && h.hour <= 23);
            const curIdx = day.findIndex((x) => x.current);
            // Sparse axis: a label every 6h would crowd mobile, so tick 6/12/18
            // plus the end (23). Each slot mirrors the bar's flex-1 so ticks line up.
            const tick = (h: number) => h === 23 || h % 6 === 0;
            // Readout for the tapped bar (mobile has no hover) — defaults to now.
            const actIdx = sel != null ? day.findIndex((h) => h.hour === sel) : curIdx;
            const act = day[actIdx];
            return (
              <>
                <div className="mt-3 mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-on-surface-variant">{t("gym.byHour")}</span>
                  {act && (
                    <span className="tabular-nums">
                      <span className="font-medium">{String(act.hour).padStart(2, "0")}:00</span>{" "}
                      <span className={OCC_TEXT[occLevel(act.pct)]}>{act.pct}%</span>
                      {actIdx > curIdx && <span className="text-on-surface-variant"> · {t("gym.forecast")}</span>}
                    </span>
                  )}
                </div>
                <div className="flex h-14 items-end gap-px">
                  {day.map((h, i) => {
                    const past = curIdx >= 0 && i < curIdx;
                    const future = curIdx >= 0 && i > curIdx;
                    return (
                      <button
                        key={h.hour}
                        type="button"
                        onClick={() => setSel((s) => (s === h.hour ? null : h.hour))}
                        aria-label={`${String(h.hour).padStart(2, "0")}:00 · ${h.pct}%${future ? ` (${t("gym.forecast")})` : ""}`}
                        className={cn(
                          "flex-1 rounded-sm",
                          OCC_BAR[occLevel(h.pct)],
                          h.current && "ring-2 ring-on-surface ring-offset-1 ring-offset-surface-container",
                          past && "opacity-30",
                          future && "opacity-60",
                          sel === h.hour && "outline outline-2 outline-on-surface",
                        )}
                        style={{ height: `${Math.max(8, h.pct)}%` }}
                      />
                    );
                  })}
                </div>
                <div className="mt-1 flex gap-px text-[10px] text-on-surface-variant">
                  {day.map((h) => (
                    <span key={h.hour} className="flex-1 text-center tabular-nums">
                      {tick(h.hour) ? String(h.hour).padStart(2, "0") : ""}
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
