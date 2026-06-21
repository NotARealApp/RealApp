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

const EMPTY_PLACE: Place = { label: "", lat: 0, lon: 0 };

// No baked-in addresses: a fresh device has nothing until the user completes
// onboarding. Times keep sensible defaults so the planner has something to show.
export const DEFAULT_PLACES: PlannerSettings = {
  home: EMPTY_PLACE,
  office: EMPTY_PLACE,
  officeArrival: { hour: 9, minute: 0 },
  homeReturn: { hour: 18, minute: 0 },
};

export const SETTINGS_KEY = "planner_settings";

// Onboarded = the user has saved settings at least once on this device.
export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SETTINGS_KEY) !== null;
}

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
