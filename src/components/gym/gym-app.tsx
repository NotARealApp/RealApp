"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader, PageSubtitle } from "@/components/layout/app-header";
import { ThemeToggle } from "@/components/icons/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, FieldLabel } from "@/components/ui/input";
import { AddressField } from "@/components/settings/address-field";
import { RouteLegs } from "@/components/dayplanner/route-legs";
import { WeatherStrip } from "@/components/dayplanner/weather-strip";
import { DumbbellIcon, HouseIcon, MapPinIcon } from "@/components/icons/nav-icons";
import { GymOccupancy } from "@/components/gym/gym-occupancy";
import { useI18n } from "@/context/I18nProvider";
import { useTheme } from "@/context/ThemeProvider";
import {
  loadPlannerSettings,
  saveGym,
  type Place,
  type PlannerSettings,
} from "@/lib/planner-settings";
import { geocodeAddress, reverseGeocode } from "@/lib/settings/geocoding";
import { isMcfit } from "@/lib/gym";
import { cn } from "@/lib/cn";
import {
  fetchRoutesPadded,
  fetchWeather,
  summarizeRoute,
  dedupeById,
  fmtTime,
  fmtDuration,
  type RouteSummary,
} from "@/lib/dayplanner/logic";
import { type WeatherData } from "@/lib/weather";

const isSet = (p: Place) => p.lat !== 0 || p.lon !== 0;

function mapsUrl(origin: Place, dest: Place) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${dest.lat},${dest.lon}&travelmode=transit`;
}

// Gym weather is fetched at the gym's own coords (not home), so it's cached
// separately from the day planner's. Refetch when stale or the gym moves.
const GYM_WEATHER_KEY = "gym_weather_cache_v1";
const WEATHER_MAX_AGE_MS = 60 * 60 * 1000;

type RouteState = { status: "loading" | "error" | "ok"; list: RouteSummary[] };

export default function GymApp() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<PlannerSettings | null>(null);

  // Setup form (shown until a gym is saved).
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Place[]>([]);
  const [picked, setPicked] = useState<Place | null>(null);
  const [studioId, setStudioId] = useState("");
  const [error, setError] = useState("");

  const [toGym, setToGym] = useState<RouteState | null>(null);
  const [toHome, setToHome] = useState<RouteState | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);

  useEffect(() => {
    setSettings(loadPlannerSettings());
  }, []);

  // Debounced address search for the setup picker — mirrors the Places form.
  useEffect(() => {
    if (query.length < 3) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setMatches(await geocodeAddress(query));
      } catch {
        setError(t("set.geoErr"));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, t]);

  const loadRoutes = useCallback(async (origin: Place, dest: Place, set: (s: RouteState) => void) => {
    set({ status: "loading", list: [] });
    try {
      const raw = await fetchRoutesPadded(origin, dest, new Date());
      const list = dedupeById((raw as Parameters<typeof summarizeRoute>[0][]).map(summarizeRoute));
      set({ status: "ok", list });
    } catch {
      set({ status: "error", list: [] });
    }
  }, []);

  const loadWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const c = JSON.parse(localStorage.getItem(GYM_WEATHER_KEY) || "null");
      if (c && c.lat === lat && c.lon === lon && Date.now() - c.savedAt < WEATHER_MAX_AGE_MS) {
        setWeather(c.data as WeatherData);
        return;
      }
    } catch { /* ignore */ }
    try {
      const data = (await fetchWeather(lat, lon)) as WeatherData;
      setWeather(data);
      localStorage.setItem(GYM_WEATHER_KEY, JSON.stringify({ savedAt: Date.now(), lat, lon, data }));
    } catch { /* weather is non-essential — leave it hidden on failure */ }
  }, []);

  const gym = settings?.gym;
  const home = settings?.home;

  // Once a gym (and home) exist, pull both route directions + gym-area weather.
  useEffect(() => {
    if (!gym || !home || !isSet(home)) return;
    loadRoutes(home, gym.place, setToGym);
    loadRoutes(gym.place, home, setToHome);
    loadWeather(gym.place.lat, gym.place.lon);
  }, [gym, home, loadRoutes, loadWeather]);

  function gps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        setPicked(await reverseGeocode(pos.coords.latitude, pos.coords.longitude));
        setMatches([]);
        setQuery("");
      } catch {
        setError(t("set.locErr"));
      }
    });
  }

  function saveSetup() {
    if (!picked) {
      setError(t("gym.pickPlace"));
      return;
    }
    saveGym({ place: picked, gymStudioId: studioId.replace(/\D/g, "") || undefined });
    setSettings(loadPlannerSettings());
    setError("");
  }

  const showStudioId = isMcfit(query) || (picked && isMcfit(picked.label));

  return (
    <>
      <AppHeader
        title={t("nav.gym")}
        actions={<ThemeToggle theme={theme} onToggle={toggleTheme} />}
      />
      <PageSubtitle>{t("gym.subtitle")}</PageSubtitle>

      {settings && !gym ? (
        // First visit: ask for the gym address (+ McFit studio id when relevant).
        <Card>
          <CardTitle className="flex items-center gap-2">
            <DumbbellIcon className="size-4 text-primary" />
            {t("gym.setupTitle")}
          </CardTitle>
          <p className="mb-3 text-sm text-on-surface-variant">{t("gym.setupHint")}</p>

          <AddressField
            title={t("gym.searchPlace")}
            icon={<MapPinIcon className="size-4 text-primary" />}
            query={query}
            placeholder={t("gym.searchPlace")}
            gpsLabel={t("set.gps")}
            noPickLabel={t("set.noPick")}
            picked={picked}
            matches={matches}
            onQueryChange={setQuery}
            onGps={gps}
            onSelect={(p) => { setPicked(p); setMatches([]); setQuery(""); }}
          />

          {showStudioId && (
            <div className="mt-3">
              <FieldLabel>{t("places.gymId")}</FieldLabel>
              <Input
                value={studioId}
                inputMode="numeric"
                placeholder={t("places.gymIdPh")}
                onChange={(e) => setStudioId(e.target.value)}
              />
              <p className="mt-1 text-xs text-on-surface-variant">{t("places.gymIdHint")}</p>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-status-bad">{error}</p>}

          <Button className="mt-3" fullWidth onClick={saveSetup}>
            {t("gym.saveSetup")}
          </Button>
        </Card>
      ) : gym && home ? (
        <>
          {gym.gymStudioId && <GymOccupancy studioId={gym.gymStudioId} t={t} />}

          {weather && (
            <WeatherStrip
              data={weather}
              dayIdx={0}
              open={weatherOpen}
              onToggle={() => setWeatherOpen((o) => !o)}
              t={t}
            />
          )}

          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate font-semibold">📍 {gym.place.label}</span>
            <button
              type="button"
              onClick={() => {
                // Prefill the setup form with the current gym, then reopen it.
                setPicked(gym.place);
                setStudioId(gym.gymStudioId ?? "");
                setSettings((s) => (s ? { ...s, gym: undefined } : s));
              }}
              className="shrink-0 text-xs text-primary"
            >
              {t("gym.change")}
            </button>
          </div>

          <RoutePanel title={t("gym.toGym")} icon={<DumbbellIcon className="size-4" />} state={toGym}
            origin={home} dest={gym.place} onRetry={() => loadRoutes(home, gym.place, setToGym)} t={t} />
          <RoutePanel title={t("gym.toHome")} icon={<HouseIcon className="size-4" />} state={toHome}
            origin={gym.place} dest={home} onRetry={() => loadRoutes(gym.place, home, setToHome)} t={t} />
        </>
      ) : settings && gym && !isSet(settings.home) ? (
        <Card>
          <p className="text-sm text-on-surface-variant">{t("places.setAnchors")}</p>
        </Card>
      ) : null}
    </>
  );
}

function RoutePanel({
  title,
  icon,
  state,
  origin,
  dest,
  onRetry,
  t,
}: {
  title: string;
  icon: React.ReactNode;
  state: RouteState | null;
  origin: Place;
  dest: Place;
  onRetry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card className="mt-3">
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
      {!state || state.status === "loading" ? (
        <p className="text-sm text-on-surface-variant">{t("dp.loading")}</p>
      ) : state.status === "error" ? (
        <p className="text-sm text-on-surface-variant">
          {t("dp.couldntRoutes")}{" "}
          <button type="button" className="underline" onClick={onRetry}>
            {t("dp.retry")}
          </button>
        </p>
      ) : state.list.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("dp.noDepartures")}</p>
      ) : (
        <div className="space-y-2.5">
          {state.list.slice(0, 5).map((r) => (
            <div key={r.id} className="rounded-2xl border border-outline-variant bg-surface-container p-3">
              <div className="mb-2 text-sm font-bold">
                {fmtTime(r.departure)} → {fmtTime(r.arrival)} ({fmtDuration(r.durationMs, t)})
              </div>
              {r.walk && (
                <p className="mb-2 text-xs text-on-surface-variant">
                  🚶 {t("dp.walkTo", { min: r.walk.minutes, dest: r.walk.dest })}
                </p>
              )}
              <RouteLegs legs={r.legs} t={t} />
            </div>
          ))}
        </div>
      )}
      <a
        href={mapsUrl(origin, dest)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary")}
      >
        <MapPinIcon className="size-4" />
        {t("dp.openMaps")}
      </a>
    </Card>
  );
}
