"use client";

import { useTheme } from "@/context/ThemeProvider";
import { PageSubtitle } from "@/components/layout/app-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useDayPlanner } from "@/hooks/use-day-planner";
import { effDepartureMs, fmtMins, fmtTime } from "@/lib/dayplanner/logic";
import { DayPlannerHeader } from "./day-planner-header";
import { WeatherStrip } from "./weather-strip";
import { DayOffNote } from "./day-off-note";
import {
  DayStepper,
  HintToast,
  PullIndicator,
  StickyLeaveBar,
  UpdatedFooter,
} from "./day-stepper";
import { LeaveByCard } from "./leave-by-card";
import { OutfitCard } from "./outfit-card";
import { RoutesList } from "./routes-list";

export default function DayPlannerApp() {
  const { theme, toggleTheme } = useTheme();
  const p = useDayPlanner();

  if (!p.settings) {
    return <p className="text-sm text-on-surface-variant">{p.t("dp.loading")}</p>;
  }

  const updatedText = p.lastUpdatedAt
    ? `${Date.now() - p.lastUpdatedAt < 60000 ? p.t("dp.updatedNow") : p.t("dp.updatedAgo", { t: fmtMins(Math.floor((Date.now() - p.lastUpdatedAt) / 60000), p.t) })} · ${p.appVersion}`
    : "";

  return (
    <>
      <PullIndicator visible={p.loading} />

      <StickyLeaveBar
        visible={!p.leaveCardVisible && !!p.showLeaveCard && !!p.chosen && p.selectedDay === 0}
        icon={p.selectedDirection === "office" ? "🏢" : "🏠"}
        time={p.chosen ? fmtTime(new Date(effDepartureMs(p.chosen)).toISOString()) : ""}
        onClick={() => p.leaveCardRef.current?.scrollIntoView({ behavior: "smooth" })}
      />

      <DayPlannerHeader
        title={p.t("dp.title")}
        homeLabel={p.t("a11y.home")}
        settingsLabel={p.t("a11y.settings")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <PageSubtitle>{p.dateLine}</PageSubtitle>

      {p.weatherData && (
        <WeatherStrip
          data={p.weatherData}
          dayIdx={p.selectedDay}
          open={p.hourlyOpen}
          onToggle={p.toggleHourly}
          t={p.t}
        />
      )}

      <main>
        {p.dayOff && (
          <DayOffNote
            message={p.dayOffMsg}
            showTimes={p.showLeaveOnDayOff}
            hideLabel={p.t("dp.hideTimes")}
            showLabel={p.t("dp.headingOut")}
            onToggle={() => p.setShowLeaveOnDayOff((v) => !v)}
          />
        )}

        <SegmentedControl
          ariaLabel="Direction"
          value={p.selectedDirection}
          onChange={p.setSelectedDirection}
          options={[
            { value: "office", label: p.t("dp.toWork") },
            { value: "home", label: p.t("dp.goingHome") },
          ]}
        />

        <DayStepper
          dayName={p.dayLabel(p.selectedDay)}
          dayDate={p.stepperDate}
          prevDisabled={p.selectedDay === 0}
          nextDisabled={p.selectedDay === 1}
          onPrev={() => p.setSelectedDay(0)}
          onNext={() => p.setSelectedDay(1)}
        />

        {p.showLeaveCard && p.chosen && (
          <LeaveByCard
            ref={p.leaveCardRef}
            chosen={p.chosen}
            selectedDay={p.selectedDay}
            selectedDirection={p.selectedDirection}
            now={p.now}
            userPick={p.userPick}
            onReset={p.resetChosen}
            t={p.t}
          />
        )}

        <OutfitCard
          title={p.t("dp.outfitFor", { day: p.dayLabel(p.selectedDay) })}
          wearKey={p.outfit?.wearKey ?? ""}
          wearTextKey={p.outfit?.wearTextKey ?? ""}
          jacketKey={p.outfit?.jacketKey ?? ""}
          jacketTextKey={p.outfit?.jacketTextKey ?? ""}
          umbrella={p.outfit?.umbrella ?? false}
          sunny={p.outfit?.sunny ?? false}
          notes={p.outfit?.notes ?? []}
          loading={!p.outfit}
          t={p.t}
        />

        <RoutesList
          title={p.routesTitle}
          summaries={p.summaries}
          visibleCount={p.visibleCount}
          selectedDay={p.selectedDay}
          selectedDirection={p.selectedDirection}
          chosenDeparture={p.chosen?.departure}
          now={p.now}
          settings={p.settings}
          staleNote={
            !p.liveLoaded[p.selectedDirection] && p.routeCacheSavedAt > 0
              ? p.t("dp.offlineFrom", { time: fmtTime(new Date(p.routeCacheSavedAt).toISOString()) })
              : undefined
          }
          routesError={p.routesError}
          loading={p.loading}
          onSelect={p.selectRoute}
          onShowMore={() => p.setVisibleCount(10)}
          onRetry={() => p.loadRoutes(p.selectedDay, p.selectedDirection, p.settings!)}
          t={p.t}
        />
      </main>

      <UpdatedFooter text={updatedText} stale={!!p.lastUpdatedAt && Date.now() - p.lastUpdatedAt >= 6 * 60000} />

      {p.showHints && (
        <HintToast message={p.t("dp.hint")} dismissLabel={p.t("dp.gotIt")} onDismiss={p.dismissHints} />
      )}
    </>
  );
}
