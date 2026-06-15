"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/context/I18nProvider";
import { loadPlannerSettings, type PlannerSettings } from "@/lib/planner-settings";
import {
  APP_VERSION,
  HOLIDAY_QUIPS,
  WEEKEND_QUIPS,
  chosenSummary,
  dayOffInfo,
  defaultDirection,
  enrichRealtime,
  fetchRoutesPadded,
  fetchWeather,
  loadHolidays,
  pick,
  routingDateTime,
  shortPlace,
  summarizeRoute,
  type RouteSummary,
} from "@/lib/dayplanner/logic";
import {
  SUNNY_HOURS,
  computeOutfit,
  daytimeApparentMin,
  daytimeMaxWind,
  daytimeMinTemp,
  daytimeRainChance,
  daytimeSunnyHours,
  type WeatherData,
} from "@/lib/weather";

export const PLANNER_CONFIG = {
  urgentMin: 4,
  soonMin: 8,
  prepBufferMin: 3,
  refreshMs: 5 * 60 * 1000,
  routeCacheMaxAgeMs: 30 * 60 * 1000,
};

const ROUTE_CACHE_KEY = "planner_routes_cache";
const WEATHER_CACHE_KEY = "dayplanner_weather_cache";

export type Direction = "home" | "office";

export function useDayPlanner() {
  const { t, dateLocale } = useI18n();
  const searchParams = useSearchParams();

  const [settings, setSettings] = useState<PlannerSettings | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedDirection, setSelectedDirection] = useState<Direction>("office");
  const [routeCache, setRouteCache] = useState<{ home: RouteSummary[] | null; office: RouteSummary[] | null }>({
    home: null,
    office: null,
  });
  const [liveLoaded, setLiveLoaded] = useState({ home: false, office: false });
  const [routeCacheSavedAt, setRouteCacheSavedAt] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [showLeaveOnDayOff, setShowLeaveOnDayOff] = useState(false);
  const [dayOffMsg, setDayOffMsg] = useState("");
  const [hourlyOpen, setHourlyOpen] = useState(false);
  const [userPick, setUserPick] = useState<{ dir: string; departure: string } | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [routesError, setRoutesError] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [leaveCardVisible, setLeaveCardVisible] = useState(true);
  const [, setTick] = useState(0);
  const leaveCardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSettings(loadPlannerSettings());
    setHourlyOpen(localStorage.getItem("hourly_open") === "1");
    try {
      setUserPick(JSON.parse(localStorage.getItem("user_pick") || "null"));
    } catch { /* ignore */ }
    setShowHints(!localStorage.getItem("hints_seen_v1"));
    const to = searchParams.get("to");
    setSelectedDirection(to === "home" || to === "office" ? to : (defaultDirection() as Direction));
  }, [searchParams]);

  const dayLabel = useCallback((dayIdx: number) => t(dayIdx === 0 ? "dp.today" : "dp.tomorrow"), [t]);

  const routesTitle = useMemo(() => {
    if (!settings) return "";
    const day = dayLabel(selectedDay);
    const place =
      selectedDirection === "home"
        ? shortPlace(settings.home.label)
        : shortPlace(settings.office.label);
    return selectedDirection === "home"
      ? t("dp.toHome", { place, day })
      : t("dp.toOffice", { place, day });
  }, [settings, selectedDay, selectedDirection, t, dayLabel]);

  const loadRouteCache = useCallback((dayIdx: number) => {
    try {
      const o = JSON.parse(localStorage.getItem(ROUTE_CACHE_KEY) || "null");
      if (!o || o.dayIdx !== dayIdx) return null;
      if (Date.now() - o.savedAt > PLANNER_CONFIG.routeCacheMaxAgeMs) return null;
      return o as { dayIdx: number; savedAt: number; routes: { home: RouteSummary[]; office: RouteSummary[] } };
    } catch {
      return null;
    }
  }, []);

  const saveRouteCache = useCallback(
    (dayIdx: number, routes: typeof routeCache, loaded: typeof liveLoaded) => {
      if (!loaded.home && !loaded.office) return;
      try {
        localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify({ dayIdx, savedAt: Date.now(), routes }));
      } catch { /* ignore */ }
    },
    [],
  );

  const loadRoutes = useCallback(
    async (dayIdx: number, dir: Direction, places: PlannerSettings) => {
      setRoutesError(false);
      let cache: { home: RouteSummary[] | null; office: RouteSummary[] | null } = {
        home: null,
        office: null,
      };
      let loaded = { home: false, office: false };

      const cached = loadRouteCache(dayIdx);
      if (cached) {
        cache = cached.routes;
        setRouteCache(cache);
        setRouteCacheSavedAt(cached.savedAt);
      } else {
        setRouteCache({ home: null, office: null });
      }

      const fetchDir = async (
        d: Direction,
        origin: { lat: number; lon: number },
        dest: { lat: number; lon: number },
        ref: { hour: number; minute: number },
      ) => {
        try {
          const time = routingDateTime(dayIdx, ref.hour, ref.minute);
          const routes = await fetchRoutesPadded(origin, dest, time);
          cache = { ...cache, [d]: routes.map(summarizeRoute) };
          loaded = { ...loaded, [d]: true };
          setRouteCache({ ...cache });
          setLiveLoaded({ ...loaded });
          if (dayIdx === 0 && cache[d]) {
            await enrichRealtime(cache[d]);
            setRouteCache({ ...cache });
          }
        } catch {
          if (!cache[d]) setRoutesError(true);
        }
      };

      if (dir === "home") {
        await fetchDir("home", places.office, places.home, places.homeReturn);
        await fetchDir("office", places.home, places.office, places.officeArrival);
      } else {
        await fetchDir("office", places.home, places.office, places.officeArrival);
        await fetchDir("home", places.office, places.home, places.homeReturn);
      }

      setLiveLoaded(loaded);
      setRouteCacheSavedAt(Date.now());
      saveRouteCache(dayIdx, cache, loaded);
      setLastUpdatedAt(Date.now());
      setVisibleCount(5);
    },
    [loadRouteCache, saveRouteCache],
  );

  const loadAll = useCallback(async () => {
    if (!settings || loading) return;
    setLoading(true);
    try {
      const yr = new Date().getFullYear();
      const [hy, hy2] = await Promise.all([loadHolidays(yr), loadHolidays(yr + 1)]);
      setHolidayMap({ ...hy, ...hy2 });
      try {
        const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "null");
        if (cached?.data) setWeatherData(cached.data);
      } catch { /* ignore */ }
      const data = await fetchWeather(settings.home.lat, settings.home.lon);
      setWeatherData(data);
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
      await loadRoutes(selectedDay, selectedDirection, settings);
    } finally {
      setLoading(false);
    }
  }, [settings, loading, selectedDay, selectedDirection, loadRoutes]);

  useEffect(() => {
    if (settings) loadAll();
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings) loadRoutes(selectedDay, selectedDirection, settings);
  }, [selectedDay, selectedDirection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (settings) loadAll();
    }, PLANNER_CONFIG.refreshMs);
    return () => clearInterval(id);
  }, [settings, loadAll]);

  useEffect(() => {
    const card = leaveCardRef.current;
    if (!card || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([e]) => setLeaveCardVisible(e.isIntersecting), { threshold: 0 });
    obs.observe(card);
    return () => obs.disconnect();
  }, []);

  const dayOff = dayOffInfo(holidayMap, selectedDay);
  useEffect(() => {
    if (!dayOff) {
      setDayOffMsg("");
      return;
    }
    if (!dayOffMsg) {
      setDayOffMsg(
        dayOff.holiday ? t(pick(HOLIDAY_QUIPS), { n: dayOff.name! }) : t(pick(WEEKEND_QUIPS)),
      );
    }
  }, [dayOff, dayOffMsg, t]);

  const summaries = routeCache[selectedDirection] || [];
  const now = new Date();
  const chosen = summaries.length
    ? chosenSummary(summaries, now, userPick, selectedDirection, PLANNER_CONFIG.prepBufferMin)
    : null;

  const outfit = useMemo(() => {
    if (!weatherData) return null;
    const rainProb = daytimeRainChance(weatherData, selectedDay);
    const wind = daytimeMaxWind(weatherData, selectedDay);
    const realMin = daytimeMinTemp(weatherData, selectedDay);
    const minTemp = daytimeApparentMin(weatherData, selectedDay);
    const base = computeOutfit(minTemp, rainProb, wind, "dayplanner");
    const notes = [...base.noteKeys.map((k) => t(k))];
    if (isFinite(realMin) && isFinite(minTemp) && Math.abs(minTemp - realMin) >= 2) {
      notes.unshift(t("dp.feelsLike", { feels: Math.round(minTemp), actual: Math.round(realMin) }));
    }
    return { ...base, notes, sunny: daytimeSunnyHours(weatherData, selectedDay) >= SUNNY_HOURS };
  }, [weatherData, selectedDay, t]);

  const selectRoute = (departure: string) => {
    setUserPick({ dir: selectedDirection, departure });
    localStorage.setItem("user_pick", JSON.stringify({ dir: selectedDirection, departure }));
    leaveCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetChosen = () => {
    setUserPick(null);
    localStorage.removeItem("user_pick");
  };

  const toggleHourly = () => {
    const next = !hourlyOpen;
    setHourlyOpen(next);
    localStorage.setItem("hourly_open", next ? "1" : "0");
  };

  const dismissHints = () => {
    localStorage.setItem("hints_seen_v1", "1");
    setShowHints(false);
  };

  const showLeaveCard = summaries.length > 0 && (!dayOff || (selectedDay === 0 && showLeaveOnDayOff));

  const dateLine = new Date().toLocaleDateString(dateLocale(), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stepperDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d.toLocaleDateString(dateLocale(), { weekday: "short", day: "numeric", month: "short" });
  })();

  return {
    t,
    settings,
    weatherData,
    selectedDay,
    setSelectedDay,
    selectedDirection,
    setSelectedDirection: (d: Direction) => {
      setSelectedDirection(d);
      setVisibleCount(5);
    },
    liveLoaded,
    routeCacheSavedAt,
    visibleCount,
    setVisibleCount,
    hourlyOpen,
    toggleHourly,
    userPick,
    lastUpdatedAt,
    loading,
    routesError,
    showHints,
    dismissHints,
    leaveCardVisible,
    leaveCardRef,
    dayOff,
    dayOffMsg,
    showLeaveOnDayOff,
    setShowLeaveOnDayOff,
    summaries,
    now,
    chosen,
    outfit,
    selectRoute,
    resetChosen,
    showLeaveCard,
    routesTitle,
    dayLabel,
    stepperDate,
    dateLine,
    loadRoutes,
    appVersion: APP_VERSION,
  };
}
