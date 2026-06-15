"use client";

import { homeCountry, type TripPlace } from "@/lib/trip/logic";
import type { WeatherData } from "@/lib/weather";

export function TripSummaryBar({
  place,
  weather,
  fmtDayDate,
  onEdit,
  t,
}: {
  place: TripPlace;
  weather: WeatherData;
  fmtDayDate: (iso: string) => string;
  onEdit: () => void;
  t: (key: string, p?: Record<string, string>) => string;
}) {
  const days = weather.daily.time;
  const intl = place.cc !== homeCountry();

  return (
    <button
      type="button"
      onClick={onEdit}
      className="mb-3.5 flex w-full items-center gap-2.5 rounded-2xl border border-outline bg-surface-container px-4 py-3 text-left text-sm font-bold text-on-surface"
    >
      <span>🧳 {place.short}</span>
      {intl && <span title={t("tr.passportShort")}>🛂</span>}
      <span className="font-medium text-on-surface-variant">
        {fmtDayDate(days[0])} – {fmtDayDate(days[days.length - 1])}
      </span>
      <span className="ms-auto whitespace-nowrap text-primary">{t("tr.change")}</span>
    </button>
  );
}

export function PlaceChips({
  places,
  active,
  onSelect,
}: {
  places: TripPlace[];
  active?: string;
  onSelect: (p: TripPlace) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {places.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onSelect(p)}
          className={
            active === p.label
              ? "min-h-10 rounded-sm border border-primary bg-primary-container px-3.5 py-2 text-sm font-medium text-on-primary-container"
              : "min-h-10 rounded-sm border border-outline bg-surface-high px-3.5 py-2 text-sm font-medium hover:bg-surface-highest"
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
