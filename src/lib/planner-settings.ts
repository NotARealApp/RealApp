export type Place = {
  label: string;
  lat: number;
  lon: number;
  countryCode?: string;
};

export type TimeOfDay = { hour: number; minute: number };

export type PlannerSettings = {
  home: Place;
  office: Place;
  officeArrival: TimeOfDay;
  homeReturn: TimeOfDay;
};

export const DEFAULT_PLACES: PlannerSettings = {
  home: {
    label: "Riesenfeldstraße 10, München",
    lat: 48.1769745,
    lon: 11.5652835,
    countryCode: "DE",
  },
  office: {
    label: "Lenbachplatz 3, München",
    lat: 48.1411534,
    lon: 11.5681888,
    countryCode: "DE",
  },
  officeArrival: { hour: 9, minute: 0 },
  homeReturn: { hour: 18, minute: 0 },
};

export const SETTINGS_KEY = "planner_settings";

export function loadPlannerSettings(): PlannerSettings {
  if (typeof window === "undefined") return DEFAULT_PLACES;
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {};
    return {
      home: s.home || DEFAULT_PLACES.home,
      office: s.office || DEFAULT_PLACES.office,
      officeArrival: s.officeArrival || DEFAULT_PLACES.officeArrival,
      homeReturn: s.homeReturn || DEFAULT_PLACES.homeReturn,
    };
  } catch {
    return DEFAULT_PLACES;
  }
}

export function savePlannerSettings(settings: PlannerSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function resetPlannerSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}
