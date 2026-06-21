"use client";

import { OutfitTiles, WeatherIcon } from "@/components/icons/weather-icons";
import { computeOutfit, tempTone, weatherInfo, type WeatherData } from "@/lib/weather";
import {
  daytimeReduce,
  homeCountry,
  sunnyHours,
  tripOverall,
  type TripPlace,
} from "@/lib/trip/logic";
import { TripPackList } from "@/components/trip/trip-pack-list";
import { SUNNY_HOURS } from "@/lib/weather";

export function TripResults({
  place,
  weather,
  tripDates,
  fmtDayDate,
  t,
}: {
  place: TripPlace;
  weather: WeatherData;
  tripDates: string[];
  fmtDayDate: (iso: string) => string;
  t: (key: string, p?: Record<string, string | number>) => string;
}) {
  const overall = tripOverall(weather);
  const intl = place.cc !== homeCountry();

  return (
    <div>
      {overall && (
        <div
          className="mb-3.5 rounded-[28px] bg-primary-container p-5 text-on-primary-container"
          // Tint the summary by the trip's hottest day so the warmth scale runs
          // top to bottom — the hero, the ribbon, and the day cards all agree.
          style={
            tempTone(overall.maxT).tinted
              ? { background: `color-mix(in srgb, var(--app-primary-container) 85%, ${tempTone(overall.maxT).hue} 15%)` }
              : undefined
          }
        >
          {/* Place only — the summary chip and ribbon already carry the dates. */}
          <div className="text-xs font-bold uppercase tracking-wide opacity-70">{place.short}</div>
          <div className="mt-1 flex items-end gap-2 tabular-nums">
            <span className="text-[2.6rem] font-extrabold leading-none tracking-tight">
              {Math.round(overall.minT)}°–{Math.round(overall.maxT)}°
            </span>
            <span className="mb-1 text-xs opacity-70">{t("tr.rainUpTo", { rain: Math.round(overall.maxRain) })}</span>
          </div>
          <TempRibbon highs={weather.daily.temperature_2m_max} dates={weather.daily.time} fmtDayDate={fmtDayDate} />
          <OutfitTiles
            wearKey={overall.outfit.wearKey}
            wearText={t(overall.outfit.wearTextKey)}
            jacketKey={overall.outfit.jacketKey}
            jacketText={t(overall.outfit.jacketTextKey)}
            umbrella={overall.outfit.umbrella}
            sunny={overall.sunny}
            sunscreen={overall.outfit.sunscreen}
            wearLabel={t("tr.wear")}
            outerwearLabel={t("tr.outerwear")}
            umbrellaLabel={t("tr.umbrella")}
            sunglassesLabel={t("tr.sunglasses")}
            sunscreenLabel={t("tr.sunscreen")}
            size={28}
          />
          {intl && (
            <div className="mt-3 rounded-xl bg-current/[0.07] px-3 py-2.5 text-xs font-bold">
              {t("tr.passport", { country: place.country })}
            </div>
          )}
          <div className="mt-2.5 text-xs opacity-70">
            {t("tr.covers")}
            {overall.outfit.noteKeys.length > 0 &&
              " · " + overall.outfit.noteKeys.map((k) => t(k)).join(" · ")}
          </div>
        </div>
      )}

      {overall && (
        <TripPackList overall={overall} dates={tripDates} fmtDayDate={fmtDayDate} t={t} />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {weather.daily.time.map((date, i) => (
          <TripDayCard key={date} date={date} index={i} weather={weather} fmtDayDate={fmtDayDate} t={t} />
        ))}
      </div>
    </div>
  );
}

// The signature: each day's high as a bar, height by temperature, tinted by the
// same warm/cool scale as the day cards — the trip's weather arc in one glance.
function TempRibbon({
  highs,
  dates,
  fmtDayDate,
}: {
  highs: (number | null)[];
  dates: string[];
  fmtDayDate: (iso: string) => string;
}) {
  const valid = highs.filter((h): h is number => h != null);
  if (!valid.length) return null;
  const lo = Math.min(...valid);
  const hi = Math.max(...valid);
  const span = Math.max(1, hi - lo);

  return (
    <div className="mb-3.5 mt-3 flex items-end gap-1.5">
      {highs.map((h, i) => {
        const tone = h == null ? { hue: "", tinted: false } : tempTone(h);
        const height = h == null ? 8 : 10 + Math.round(((h - lo) / span) * 26);
        const day = parseInt(dates[i].slice(8, 10), 10);
        return (
          <div key={dates[i]} className="flex flex-1 flex-col items-center gap-1" title={fmtDayDate(dates[i])}>
            <span className="text-[0.6rem] font-bold tabular-nums">{h == null ? "–" : `${Math.round(h)}°`}</span>
            <div className="flex h-9 w-full items-end">
              <div
                className="w-full rounded-md"
                style={{ height, background: tone.tinted ? tone.hue : "currentColor", opacity: tone.tinted ? 1 : 0.3 }}
              />
            </div>
            <span className="text-[0.6rem] tabular-nums opacity-55">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

function TripDayCard({
  date,
  index,
  weather,
  fmtDayDate,
  t,
}: {
  date: string;
  index: number;
  weather: WeatherData;
  fmtDayDate: (iso: string) => string;
  t: (key: string, p?: Record<string, string | number>) => string;
}) {
  const code = weather.daily.weathercode[index];
  if (code == null || weather.daily.temperature_2m_max[index] == null) {
    return (
      <div className="rounded-[18px] border border-outline bg-surface-container p-3.5 text-sm text-on-surface-variant">
        <div className="font-bold">{fmtDayDate(date)}</div>
        <div>{t("tr.noData")}</div>
      </div>
    );
  }

  const [labelKey, cat] = weatherInfo(code);
  const max = Math.round(weather.daily.temperature_2m_max[index]);
  const min = Math.round(weather.daily.temperature_2m_min[index]);
  const wMin = daytimeReduce(weather, index, "apparent_temperature", Math.min, Infinity);
  const wRain = daytimeReduce(weather, index, "precipitation_probability", Math.max, 0);
  const wWind = daytimeReduce(weather, index, "windspeed_10m", Math.max, 0);
  const outfit = computeOutfit(
    wMin ?? min,
    wRain ?? weather.daily.precipitation_probability_max[index],
    wWind ?? weather.daily.windspeed_10m_max[index],
    "trip",
    weather.daily.uv_index_max?.[index] ?? null,
  );

  // Tint the card + temperature by the day's high so hot/cold days pop when
  // scanning; mild days stay neutral surface.
  const tone = tempTone(max);
  const cardStyle = tone.tinted
    ? {
        background: `color-mix(in srgb, var(--app-surface-container) 88%, ${tone.hue} 12%)`,
        borderColor: `color-mix(in srgb, var(--app-outline) 65%, ${tone.hue} 35%)`,
      }
    : undefined;

  return (
    <div className="rounded-[18px] border border-outline bg-surface-container p-3.5" style={cardStyle}>
      <div className="mb-2.5 flex items-center gap-3">
        <WeatherIcon category={cat} size={34} />
        <div className="min-w-0 flex-1">
          <div className="font-bold">{fmtDayDate(date)}</div>
          <div className="text-xs text-on-surface-variant">{t(labelKey)}</div>
        </div>
        <div className="text-xl font-extrabold tabular-nums" style={tone.tinted ? { color: tone.hue } : undefined}>
          <span className="opacity-55">{min}°</span> {max}°
        </div>
      </div>
      <div className="mb-2.5 text-xs tabular-nums text-on-surface-variant">
        🌧️ {weather.daily.precipitation_probability_max[index] ?? "–"}% · 💨{" "}
        {Math.round(weather.daily.windspeed_10m_max[index])} km/h
      </div>
      <OutfitTiles
        wearKey={outfit.wearKey}
        wearText={t(outfit.wearTextKey)}
        jacketKey={outfit.jacketKey}
        jacketText={t(outfit.jacketTextKey)}
        umbrella={outfit.umbrella}
        sunny={sunnyHours(weather, index) >= SUNNY_HOURS}
        sunscreen={outfit.sunscreen}
        wearLabel={t("tr.wear")}
        outerwearLabel={t("tr.outerwear")}
        umbrellaLabel={t("tr.umbrella")}
        sunglassesLabel={t("tr.sunglasses")}
        sunscreenLabel={t("tr.sunscreen")}
        size={28}
      />
      {outfit.noteKeys.length > 0 && (
        <div className="mt-2.5 text-xs text-on-surface-variant">
          {outfit.noteKeys.map((k) => t(k)).join(" · ")}
        </div>
      )}
    </div>
  );
}
