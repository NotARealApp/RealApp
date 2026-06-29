export type Place = {
  label: string;
  lat: number;
  lon: number;
  countryCode?: string;
};

export type TimeOfDay = { hour: number; minute: number };

// A saved place you travel to, anchored to one of the two commute endpoints as
// its origin — "from home or work". The planner already knows home/office, so a
// destination only stores its own coords + which anchor it leaves from.
export type Destination = {
  id: string;
  label: string;
  place: Place;
  origin: "home" | "office";
  // Optional McFit/RSG studio id — when set, the destination panel also shows
  // live gym occupancy (see lib/gym.ts).
  gymStudioId?: string;
};

// The gym is a single pinned destination (its own tab), always anchored to home
// — home→gym and gym→home. Optional McFit studio id drives live occupancy.
export type Gym = {
  place: Place;
  gymStudioId?: string;
};

// Which optional tabs the bottom nav shows. Both default off — Today/Trip/Settings
// are always present; the user opts into Gym and Places from Settings.
export type TabFlags = {
  places: boolean;
  gym: boolean;
};

export type PlannerSettings = {
  home: Place;
  office: Place;
  officeArrival: TimeOfDay;
  homeReturn: TimeOfDay;
  destinations: Destination[];
  gym?: Gym;
  tabs: TabFlags;
};

const EMPTY_PLACE: Place = { label: "", lat: 0, lon: 0 };

// No baked-in addresses: a fresh device has nothing until the user completes
// onboarding. Times keep sensible defaults so the planner has something to show.
export const DEFAULT_PLACES: PlannerSettings = {
  home: EMPTY_PLACE,
  office: EMPTY_PLACE,
  officeArrival: { hour: 9, minute: 0 },
  homeReturn: { hour: 18, minute: 0 },
  destinations: [],
  tabs: { places: false, gym: false },
};

export const SETTINGS_KEY = "planner_settings";

// Fired after any write so always-mounted chrome (the bottom nav) can re-read
// without a reload when tab visibility or the gym changes.
export const SETTINGS_EVENT = "planner-settings-changed";

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
      destinations: Array.isArray(s.destinations) ? s.destinations : [],
      gym: s.gym || undefined,
      tabs: { ...DEFAULT_PLACES.tabs, ...(s.tabs || {}) },
    };
  } catch {
    return DEFAULT_PLACES;
  }
}

export function savePlannerSettings(settings: PlannerSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  notifyChange();
}

// Best-effort: the bottom nav listens for this. Guarded so SSR and the test
// environment (which stubs only localStorage) don't blow up.
function notifyChange() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }
}

// Read-modify-write helpers that touch one slice and leave the rest intact.
export function saveGym(gym: Gym) {
  savePlannerSettings({ ...loadPlannerSettings(), gym });
}

export function saveTabs(tabs: TabFlags) {
  savePlannerSettings({ ...loadPlannerSettings(), tabs });
}

// Read-modify-write just the destinations list, leaving home/office/times
// untouched — the Places page owns destinations, the Settings page owns the rest.
export function saveDestinations(destinations: Destination[]) {
  savePlannerSettings({ ...loadPlannerSettings(), destinations });
}

export function resetPlannerSettings() {
  localStorage.removeItem(SETTINGS_KEY);
  notifyChange();
}
