import type { WeatherData } from "@/lib/weather";
import { WAKING, SUNNY_HOURS, computeOutfit, weatherInfo } from "@/lib/weather";

export const EUROPE_CC = new Set([
  "AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE",
  "GR","HU","IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL",
  "MK","NO","PL","PT","RO","RU","SM","RS","SK","SI","ES","SE","CH","UA","GB",
  "VA","TR","GI","FO","IM","JE","GG",
]);

export type TripPlace = {
  lat: number;
  lon: number;
  label: string;
  short: string;
  cc: string;
  country: string;
};

export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Every date in the trip, inclusive — the true length for packing, independent
// of how far the weather forecast reaches.
export function tripDateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (d <= last) {
    out.push(ymd(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function daytimeReduce(
  data: WeatherData,
  dayIdx: number,
  field: keyof WeatherData["hourly"],
  fn: (a: number, b: number) => number,
  init: number,
) {
  const date = data.daily.time[dayIdx];
  let res = init;
  let seen = false;
  for (let i = 0; i < data.hourly.time.length; i++) {
    const [d, t] = data.hourly.time[i].split("T");
    if (d !== date) continue;
    const h = parseInt(t.split(":")[0], 10);
    if (h < WAKING.start || h > WAKING.end) continue;
    const v = data.hourly[field][i];
    if (typeof v !== "number") continue;
    res = fn(res, v);
    seen = true;
  }
  return seen ? res : null;
}

export function sunnyHours(data: WeatherData, dayIdx: number) {
  const date = data.daily.time[dayIdx];
  let hours = 0;
  for (let i = 0; i < data.hourly.time.length; i++) {
    const [d, t] = data.hourly.time[i].split("T");
    if (d !== date) continue;
    const h = parseInt(t.split(":")[0], 10);
    if (h < WAKING.start || h > WAKING.end) continue;
    if (weatherInfo(data.hourly.weathercode[i])[1] === "sun") hours++;
  }
  return hours;
}

export function homeCountry() {
  try {
    const s = JSON.parse(localStorage.getItem("planner_settings") || "null");
    return (s?.home?.countryCode || "DE").toUpperCase();
  } catch {
    return "DE";
  }
}

export async function geocodeTripPlace(name: string): Promise<TripPlace[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en`;
  const d = await fetch(url).then((r) => r.json());
  return (d.results || [])
    .filter((r: { country_code: string }) => EUROPE_CC.has(r.country_code))
    .slice(0, 5)
    .map((r: { latitude: number; longitude: number; name: string; admin1?: string; country: string; country_code: string }) => ({
      lat: r.latitude,
      lon: r.longitude,
      label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      short: r.name,
      cc: (r.country_code || "").toUpperCase(),
      country: r.country,
    }));
}

// open-meteo's forecast horizon is 16 days from today; a range past it returns
// an error object with no `daily`. Clamp the request so we always get a usable
// forecast — packing still uses the real trip length (see TripPackList).
export const FORECAST_HORIZON_DAYS = 16;

export async function fetchTripWeather(lat: number, lon: number, start: string, end: string) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + FORECAST_HORIZON_DAYS - 1);
  const maxEnd = ymd(horizon);
  const s = start > maxEnd ? maxEnd : start;
  const e = end > maxEnd ? maxEnd : end;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max,uv_index_max` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m` +
    `&timezone=auto&start_date=${s}&end_date=${e}`;
  return fetch(url).then((r) => r.json()) as Promise<WeatherData>;
}

export function tripOverall(data: WeatherData) {
  let minT = Infinity;
  let maxT = -Infinity;
  let maxRain = 0;
  let maxWind = 0;
  let maxUv = 0;
  let anySunny = false;
  let valid = 0;

  for (let i = 0; i < data.daily.time.length; i++) {
    if (data.daily.temperature_2m_max[i] == null) continue;
    valid++;
    if (sunnyHours(data, i) >= SUNNY_HOURS) anySunny = true;
    const dMin = daytimeReduce(data, i, "apparent_temperature", Math.min, Infinity);
    const dRain = daytimeReduce(data, i, "precipitation_probability", Math.max, 0);
    const dWind = daytimeReduce(data, i, "windspeed_10m", Math.max, 0);
    minT = Math.min(minT, dMin ?? data.daily.temperature_2m_min[i]);
    maxT = Math.max(maxT, data.daily.temperature_2m_max[i]);
    maxRain = Math.max(maxRain, dRain ?? data.daily.precipitation_probability_max[i] ?? 0);
    maxWind = Math.max(maxWind, dWind ?? data.daily.windspeed_10m_max[i]);
    maxUv = Math.max(maxUv, data.daily.uv_index_max?.[i] ?? 0);
  }

  if (!valid) return null;
  return { minT, maxT, maxRain, maxWind, sunny: anySunny, outfit: computeOutfit(minT, maxRain, maxWind, "trip", maxUv) };
}

export type TripOverall = NonNullable<ReturnType<typeof tripOverall>>;

export type PackItem = { key: string; qty: number };

// Days a wash needs to be dry again — slower when cold/damp, faster in summer
// heat. A wash timed to dry before it's next needed covers this many days.
export function dryDays(overall: TripOverall) {
  return overall.maxT >= 22 ? 2 : 4; // summer ~2 days to dry, winter ~4
}

// off  = no laundry, pack the whole trip.
// once = one late wash, dries before the last day → pack days − dryDays.
// light = wash every dryDays (travel light) → pack just one cycle + buffer.
export type LaundryMode = "off" | "once" | "light";

// Days of clothes to actually pack for, given the laundry plan. Trips too short
// to wash-and-dry fall back to the full length whatever the mode.
export function effDays(days: number, overall: TripOverall, mode: LaundryMode): number {
  const dry = dryDays(overall);
  if (mode === "off" || days <= dry) return days;
  if (mode === "once") return Math.max(2, days - dry);
  return Math.min(days, dry + 1); // light
}

// Which trip dates to do laundry on, for the hint. `once` is a single late wash;
// `light` washes every dryDays so each batch dries before the next is needed.
export function washDays(dates: string[], overall: TripOverall, mode: LaundryMode): string[] {
  const dry = dryDays(overall);
  const n = dates.length;
  if (n <= dry || mode === "off") return [];
  if (mode === "once") return [dates[n - 1 - dry]];
  const out: string[] = [];
  for (let i = dry - 1; i + dry <= n - 1; i += dry) out.push(dates[i]);
  return out;
}

// Clothing quantities to pack. Daily items (underwear/socks/shirts) scale with
// effective days; bottoms/jackets are reused, so they grow slowly.
export function packList(days: number, overall: TripOverall, mode: LaundryMode): PackItem[] {
  const eff = effDays(days, overall, mode);
  // Tops are re-worn, not daily — packing guides (NYT 5-4-3-2-1, carry-on
  // systems) land ~4-6 tops per week. Factor scales with warmth: hot sweats
  // through more, cold layers re-wear under a sweater. Socks/underwear stay
  // daily (eff + 1) — that's hygiene, not temperature.
  const topFactor = overall.maxT >= 22 ? 0.8 : overall.maxT >= 12 ? 0.6 : 0.5;
  const tops = Math.max(2, Math.ceil(eff * topFactor));
  const items: PackItem[] = [
    { key: "pack.tshirts", qty: tops },
    // Need a spare pair when washing — wear one while the other dries — so the
    // floor is 2 with laundry, 1 without. The worn-set subtraction below then
    // leaves ≥1 packed when washing, 0 on a no-wash trip (wear your only pair).
    { key: "pack.bottoms", qty: Math.max(mode === "off" ? 1 : 2, Math.ceil(eff / 3)) },
    { key: "pack.underwear", qty: eff + 1 },
    { key: "pack.socks", qty: eff + 1 },
    { key: "pack.sleepwear", qty: Math.max(1, Math.ceil(eff / 4)) },
    // Thermal base layers only when it's actually freezing — same threshold
    // computeOutfit uses to recommend thermals. Reused, so a couple cover a week.
    { key: "pack.thermals", qty: overall.minT < 2 ? Math.max(1, Math.ceil(eff / 5)) : 0 },
    { key: "pack.sweater", qty: overall.minT < 15 ? 1 : 0 },
    { key: "pack.jacket", qty: overall.outfit.jacketKey !== "sun" ? 1 : 0 },
  ];
  // The list is what goes in the bag. Only genuinely re-worn items get the
  // "wearing one travelling" discount — the travel pants/top are re-used on
  // day 2, so don't pack them again. Underwear & socks are single-use-then-wash
  // (no re-wear), and outerwear is a "don't forget a jacket" reminder, so both
  // stay at full count.
  const worn = new Set(["pack.tshirts", "pack.bottoms"]);
  return items
    .map((i) => (worn.has(i.key) ? { ...i, qty: i.qty - 1 } : i))
    .filter((i) => i.qty > 0);
}
