"use client";

import { forwardRef } from "react";
import {
  effBoardMs,
  effDepartureMs,
  fmtMins,
  fmtTime,
  leaveTier,
  type RouteSummary,
} from "@/lib/dayplanner/logic";
import { PLANNER_CONFIG } from "@/hooks/use-day-planner";
import { leaveTierClass } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Direction } from "@/hooks/use-day-planner";

type LeaveByCardProps = {
  chosen: RouteSummary;
  selectedDay: number;
  selectedDirection: Direction;
  now: Date;
  userPick: { dir: string; departure: string } | null;
  onReset: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const LeaveByCard = forwardRef<HTMLElement, LeaveByCardProps>(function LeaveByCard(
  { chosen, selectedDay, selectedDirection, now, userPick, onReset, t },
  ref,
) {
  if (selectedDay === 1) {
    const origin = t(selectedDirection === "office" ? "dp.home" : "dp.office");
    const leaveTime = new Date(chosen.departure);
    const board = chosen.legs[0] ? new Date(chosen.legs[0].boardTime) : leaveTime;
    const line = chosen.legs[0]?.line || "walk";

    return (
      <Card ref={ref}>
        <CardTitle>
          {`${t("dp.tomorrow")} — ${t(selectedDirection === "office" ? "dp.toWork" : "dp.goingHome")}`}
        </CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <LeaveColumn label={t("dp.leaveAt", { origin })} time={fmtTime(leaveTime.toISOString())} sub={t("dp.aroundTime")} />
          <LeaveColumn label={t("dp.firstTrain", { line })} time={fmtTime(board.toISOString())} sub={t("dp.planningAhead")} />
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          {chosen.walk ? t("dp.walkTo", { min: chosen.walk.minutes, dest: chosen.walk.dest }) : t("dp.noWalk")} · {t("dp.tomorrow")}
        </p>
      </Card>
    );
  }

  const origin = t(selectedDirection === "office" ? "dp.home" : "dp.office");
  const leaveTime = new Date(effDepartureMs(chosen));
  const departTime = new Date(effBoardMs(chosen));
  const delayMin = chosen.legs[0]?.delayMin || 0;
  const leaveDiff = Math.round((leaveTime.getTime() - now.getTime()) / 60000);
  const departDiff = Math.round((departTime.getTime() - now.getTime()) / 60000);
  const lineLabel = chosen.legs[0]?.line || "walk";

  const leaveText = leaveDiff <= 0 ? t("dp.leaveNow") : t("dp.leaveIn", { t: fmtMins(leaveDiff, t) });
  const departText = departDiff <= 0 ? t("dp.now") : fmtMins(departDiff, t);
  const leaveLevel = leaveTier(leaveDiff, PLANNER_CONFIG.urgentMin, PLANNER_CONFIG.soonMin);
  const departLevel = leaveTier(departDiff, PLANNER_CONFIG.urgentMin, PLANNER_CONFIG.soonMin);

  let depLabel = t("dp.departure", { line: lineLabel });
  if (chosen.legs[0]?.cancelled) depLabel += ` ✖ ${t("dp.cancelled")}`;
  else if (delayMin > 0) depLabel += ` · ${t("dp.minLate", { n: delayMin })}`;

  const isUserPick = userPick && userPick.dir === selectedDirection;

  return (
    <Card ref={ref}>
      <CardTitle>
        {`${t("dp.timeToGo")} — ${t(selectedDirection === "office" ? "dp.toWork" : "dp.goingHome")}`}
      </CardTitle>
      <div className="grid grid-cols-2 gap-4">
        <LeaveColumn
          label={t("dp.leaveAt", { origin })}
          time={fmtTime(leaveTime.toISOString())}
          countdown={leaveText}
          countdownClass={cn("font-bold", leaveTierClass(leaveLevel))}
        />
        <LeaveColumn
          label={depLabel}
          time={fmtTime(departTime.toISOString())}
          countdown={departText}
          countdownClass={leaveTierClass(departLevel)}
        />
      </div>
      <p className="mt-3 text-xs text-on-surface-variant">
        {chosen.walk ? t("dp.walkTo", { min: chosen.walk.minutes, dest: chosen.walk.dest }) : t("dp.noWalk")}
        {isUserPick ? ` · ${t("dp.yourPick")}` : ""}
      </p>
      {isUserPick && (
        <div className="mt-3">
          <Button variant="ghost" className="min-h-9 px-4 py-2 text-xs" onClick={onReset}>
            {t("dp.default")}
          </Button>
        </div>
      )}
    </Card>
  );
});

function LeaveColumn({
  label,
  time,
  sub,
  countdown,
  countdownClass,
}: {
  label: string;
  time: string;
  sub?: string;
  countdown?: string;
  countdownClass?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</div>
      <div className="text-2xl font-bold tracking-tight">{time}</div>
      {countdown && <div className={cn("text-sm", countdownClass)}>{countdown}</div>}
      {sub && <div className="text-sm text-on-surface-variant">{sub}</div>}
    </div>
  );
}
