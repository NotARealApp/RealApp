"use client";

import {
  fmtDuration,
  fmtMins,
  fmtTime,
  leaveTier,
  mapsUrlFor,
  routeCancelled,
  routeRelMin,
  type RouteSummary,
} from "@/lib/dayplanner/logic";
import { PLANNER_CONFIG } from "@/hooks/use-day-planner";
import { leaveTierClass } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPinIcon } from "@/components/icons/nav-icons";
import { RouteLegs } from "./route-legs";
import { cn } from "@/lib/cn";
import type { Direction } from "@/hooks/use-day-planner";
import type { PlannerSettings } from "@/lib/planner-settings";

type RoutesListProps = {
  title: string;
  summaries: RouteSummary[];
  visibleCount: number;
  selectedDay: number;
  selectedDirection: Direction;
  chosenId?: string;
  now: Date;
  settings: PlannerSettings;
  staleNote?: string;
  routesError: boolean;
  loading: boolean;
  plan?: boolean;
  onSelect: (id: string) => void;
  onShowMore: () => void;
  onRetry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export function RoutesList({
  title,
  summaries,
  visibleCount,
  selectedDay,
  selectedDirection,
  chosenId,
  now,
  settings,
  staleNote,
  routesError,
  loading,
  plan,
  onSelect,
  onShowMore,
  onRetry,
  t,
}: RoutesListProps) {
  // Match the chosen route by its stable id, not departure time — two routes can
  // share a departure minute, and matching by time highlights all of them.
  const chosenIdx = chosenId != null ? summaries.findIndex((s) => s.id === chosenId) : -1;

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {staleNote && <p className="mb-3 text-xs text-status-warn">{staleNote}</p>}

      {routesError ? (
        <div className="text-sm text-on-surface-variant">
          {t("dp.couldntRoutes")}{" "}
          <Button variant="soft" className="ms-2 inline min-h-8 px-3 py-1 text-xs" onClick={onRetry}>
            {t("dp.retry")}
          </Button>
        </div>
      ) : summaries.length === 0 ? (
        loading ? (
          <div className="space-y-2" aria-label={t("dp.loading")} role="status">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">{t("dp.noDepartures")}</p>
        )
      ) : (
        <>
          {summaries.slice(0, visibleCount).map((route, idx) => (
            <RouteRow
              key={route.id}
              route={route}
              index={idx}
              selectedDay={selectedDay}
              plan={plan}
              isChosen={idx === chosenIdx}
              now={now}
              settings={settings}
              selectedDirection={selectedDirection}
              onSelect={onSelect}
              t={t}
            />
          ))}
          {summaries.length > visibleCount && (
            <Button variant="ghost" fullWidth className="mt-2" onClick={onShowMore}>
              {t("dp.showMore")}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function RouteRow({
  route,
  index,
  selectedDay,
  plan,
  isChosen,
  now,
  settings,
  selectedDirection,
  onSelect,
  t,
}: {
  route: RouteSummary;
  index: number;
  selectedDay: number;
  plan?: boolean;
  isChosen: boolean;
  now: Date;
  settings: PlannerSettings;
  selectedDirection: Direction;
  onSelect: (id: string) => void;
  t: RoutesListProps["t"];
}) {
  const delayM = route.legs[0]?.delayMin || 0;
  const cancelled = routeCancelled(route);
  // In a leave-by/arrive-by plan, show every planned route as-is — don't hide
  // ones before "now" or overlay a live countdown (that's only for live "now").
  const diffExact = routeRelMin(route, now, selectedDay, !!plan);
  if (diffExact !== null && diffExact < 0) return null;

  const relTier =
    diffExact !== null
      ? leaveTier(Math.round(diffExact), PLANNER_CONFIG.urgentMin, PLANNER_CONFIG.soonMin)
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(route.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(route.id);
        }
      }}
      className={cn(
        "mb-2 cursor-pointer rounded-2xl border-s-4 border-outline bg-surface-high p-3 transition hover:bg-surface-highest",
        isChosen && "border-s-status-good bg-status-good/10 ring-2 ring-inset ring-status-good",
      )}
    >
      {isChosen && (
        <div className="mb-1 text-[0.66rem] font-extrabold uppercase tracking-wider text-status-good">
          ▶ {t("dp.catchThis")}
        </div>
      )}
      <div className="mb-2 text-sm font-bold">
        <span className="me-2 inline-flex size-5 items-center justify-center rounded-full bg-surface-container text-xs">
          {index + 1}
        </span>
        {fmtTime(route.departure)} → {fmtTime(route.arrival)} ({fmtDuration(route.durationMs, t)})
        {cancelled && (
          <span className="ms-2 rounded-full bg-status-bad/20 px-2 py-0.5 text-xs text-status-bad">
            {t("dp.cancelled")}
          </span>
        )}
        {!cancelled && delayM > 0 && (
          <span className="ms-2 rounded-full bg-status-warn/20 px-2 py-0.5 text-xs text-status-warn">
            {t("dp.minLate", { n: delayM })}
          </span>
        )}
        {diffExact !== null && relTier && (
          <span className={cn("ms-1 text-sm font-semibold", leaveTierClass(relTier))}>
            · {Math.round(diffExact) <= 0 ? t("dp.now") : fmtMins(Math.round(diffExact), t)}
          </span>
        )}
      </div>

      {route.walk && (
        <p className="mb-2 text-xs text-on-surface-variant">
          🚶 {t("dp.walkTo", { min: route.walk.minutes, dest: route.walk.dest })}
        </p>
      )}

      <RouteLegs legs={route.legs} t={t} />

      <div className="mt-2">
        <Button
          variant="ghost"
          className="inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            window.open(mapsUrlFor(selectedDirection, settings.home, settings.office), "_blank");
          }}
        >
          <MapPinIcon className="size-4" />
          {t("dp.openMaps")}
        </Button>
      </div>
    </div>
  );
}
