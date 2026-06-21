import { afterEach, describe, expect, it, vi } from "vitest";
import type { WeatherData } from "@/lib/weather";
import { EUROPE_CC, daytimeReduce, geocodeTripPlace, homeCountry, packList, tripDateRange, washDays, sunnyHours, tripOverall, ymd, type TripOverall } from "./logic";

function fixture(): WeatherData {
  const hours = ["07", "08", "12", "21", "22"];
  const mk = (day: string, temp: number, app: number, rain: number, wc: number, wind: number) =>
    hours.map((h) => ({ t: `${day}T${h}:00`, temp, app, rain, wc, wind }));
  const rows = [...mk("2026-07-01", 18, 17, 20, 0, 10), ...mk("2026-07-02", 22, 21, 60, 61, 25)];
  return {
    daily: {
      time: ["2026-07-01", "2026-07-02"],
      temperature_2m_max: [21, 26],
      temperature_2m_min: [14, 16],
      precipitation_probability_max: [20, 60],
      weathercode: [0, 61],
      windspeed_10m_max: [10, 25],
    },
    hourly: {
      time: rows.map((r) => r.t),
      temperature_2m: rows.map((r) => r.temp),
      apparent_temperature: rows.map((r) => r.app),
      precipitation_probability: rows.map((r) => r.rain),
      weathercode: rows.map((r) => r.wc),
      windspeed_10m: rows.map((r) => r.wind),
    },
  };
}

describe("ymd", () => {
  it("formats zero-padded local YYYY-MM-DD", () => {
    expect(ymd(new Date(2026, 6, 1))).toBe("2026-07-01");
  });
});

describe("EUROPE_CC", () => {
  it("includes European country codes and excludes others", () => {
    expect(EUROPE_CC.has("DE")).toBe(true);
    expect(EUROPE_CC.has("GB")).toBe(true);
    expect(EUROPE_CC.has("US")).toBe(false);
    expect(EUROPE_CC.has("JP")).toBe(false);
  });
});

describe("daytimeReduce", () => {
  const d = fixture();
  it("reduces values within the waking window", () => {
    expect(daytimeReduce(d, 1, "precipitation_probability", Math.max, 0)).toBe(60);
  });
  it("returns null when the day has no in-window data", () => {
    expect(daytimeReduce(d, 5, "temperature_2m", Math.min, Infinity)).toBeNull();
  });
});

describe("sunnyHours", () => {
  it("counts sun-category hours in the waking window", () => {
    // Day 0 weathercode 0 (sun) at 08,12,21 → 3 sunny hours.
    expect(sunnyHours(fixture(), 0)).toBe(3);
    expect(sunnyHours(fixture(), 1)).toBe(0);
  });
});

describe("homeCountry", () => {
  it("defaults to DE without stored settings", () => {
    expect(homeCountry()).toBe("DE");
  });
});

describe("tripOverall", () => {
  it("aggregates min/max across valid days and includes an outfit", () => {
    const o = tripOverall(fixture());
    expect(o).not.toBeNull();
    expect(o!.maxT).toBe(26);
    expect(o!.maxRain).toBe(60);
    expect(o!.maxWind).toBe(25);
    expect(o!.sunny).toBe(true);
    expect(o!.outfit).toBeTruthy();
  });

  it("returns null when no day has data", () => {
    const empty: WeatherData = {
      daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [], weathercode: [], windspeed_10m_max: [] },
      hourly: { time: [], temperature_2m: [], apparent_temperature: [], precipitation_probability: [], weathercode: [], windspeed_10m: [] },
    };
    expect(tripOverall(empty)).toBeNull();
  });
});

describe("packList", () => {
  const hot = { minT: 18, maxT: 25, maxRain: 0, maxWind: 5, sunny: true, outfit: { jacketKey: "sun" } } as TripOverall;
  const cold = { minT: 6, maxT: 12, maxRain: 0, maxWind: 5, sunny: false, outfit: { jacketKey: "coat" } } as TripOverall;
  const qty = (items: { key: string; qty: number }[], key: string) => items.find((i) => i.key === key)?.qty ?? 0;

  const winter = { minT: -2, maxT: 4, maxRain: 0, maxWind: 10, sunny: false, outfit: { jacketKey: "coat" } } as TripOverall;

  it("scales daily items by trip length, no sweater/jacket when warm", () => {
    // no laundry → raw per-day scaling, minus the one set worn travelling
    const p = packList(3, hot, "off");
    expect(qty(p, "pack.tshirts")).toBe(2); // ceil(3 * 0.8) = 3, − 1 worn
    expect(qty(p, "pack.underwear")).toBe(4); // 3 + 1, no worn discount (no re-wear)
    expect(qty(p, "pack.socks")).toBe(4);
    expect(qty(p, "pack.bottoms")).toBe(0); // 1 − 1 worn → hidden (wear your only pants)
    expect(qty(p, "pack.sweater")).toBe(0);
    expect(qty(p, "pack.jacket")).toBe(0);
  });

  it("subtracts drying time with laundry on (summer 2 days), linear when off", () => {
    // hot → dries in 2 days; eff = max(2, 14 - 2) = 12; underwear = eff + 1
    expect(qty(packList(14, hot, "once"), "pack.underwear")).toBe(13);
    expect(qty(packList(14, hot, "off"), "pack.underwear")).toBe(15); // 14 + 1
  });

  it("subtracts a longer dry time in winter (4 days)", () => {
    // winter → dries in 4 days; eff = max(2, 14 - 4) = 10; underwear = eff + 1
    expect(qty(packList(14, winter, "once"), "pack.underwear")).toBe(11);
  });

  it("laundry is a no-op on trips too short to wash-and-dry", () => {
    // 3-day winter: 3 <= dryDays 4 → packs full length, same as laundry off
    expect(qty(packList(3, winter, "once"), "pack.underwear")).toBe(qty(packList(3, winter, "off"), "pack.underwear"));
  });

  it("adds sweater + jacket when cold", () => {
    const p = packList(5, cold, "off");
    expect(qty(p, "pack.sweater")).toBe(1); // outerwear not reduced by worn set
    expect(qty(p, "pack.jacket")).toBe(1);
    expect(qty(p, "pack.tshirts")).toBe(2); // ceil(5 * 0.6) = 3, − 1 worn
  });

  it("packs fewer tops in winter (re-worn base layers) but socks stay daily", () => {
    // winter dries in 4 days; eff = max(2, 7 - 4) = 3
    const p = packList(7, winter, "once");
    expect(qty(p, "pack.tshirts")).toBe(1); // max(2, ceil(3 * 0.5)) = 2, − 1 worn
    expect(qty(p, "pack.socks")).toBe(4); // eff + 1, daily, no worn discount
    expect(qty(p, "pack.underwear")).toBe(4);
    expect(qty(p, "pack.thermals")).toBe(1); // ceil(3 / 5), not reduced
  });

  it("only packs thermals when freezing (minT < 2)", () => {
    expect(qty(packList(5, cold, "once"), "pack.thermals")).toBe(0); // minT 6
  });

  it("travel-light packs fewer than one-wash, which packs fewer than none", () => {
    // 6-day hot trip: light eff=min(6,3)=3, once eff=max(2,4)=4, off eff=6
    expect(qty(packList(6, hot, "light"), "pack.underwear")).toBe(4); // 3 + 1
    expect(qty(packList(6, hot, "once"), "pack.underwear")).toBe(5); // 4 + 1
    expect(qty(packList(6, hot, "off"), "pack.underwear")).toBe(7); // 6 + 1
  });

  it("keeps a spare pair of bottoms when washing (wear one, wash one)", () => {
    expect(qty(packList(6, hot, "light"), "pack.bottoms")).toBe(1); // floor 2 − 1 worn
    expect(qty(packList(6, hot, "once"), "pack.bottoms")).toBe(1);
  });
});

describe("tripDateRange", () => {
  it("lists every date inclusive, independent of the forecast horizon", () => {
    expect(tripDateRange("2026-06-21", "2026-06-24")).toEqual([
      "2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24",
    ]);
    expect(tripDateRange("2026-06-21", "2026-06-21")).toEqual(["2026-06-21"]);
    expect(tripDateRange("2026-07-10", "2026-07-01")).toEqual([]); // end before start
  });
});

describe("washDays", () => {
  const hot = { minT: 18, maxT: 25, maxRain: 0, maxWind: 5, sunny: true, outfit: { jacketKey: "sun" } } as TripOverall;
  const dates = ["2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26"];

  it("light mode washes every dry-cycle (summer: the 22nd & 24th)", () => {
    expect(washDays(dates, hot, "light")).toEqual(["2026-06-22", "2026-06-24"]);
  });

  it("once mode is a single late wash that dries before the last day", () => {
    expect(washDays(dates, hot, "once")).toEqual(["2026-06-24"]);
  });

  it("no wash days when off or trip too short to dry", () => {
    expect(washDays(dates, hot, "off")).toEqual([]);
    expect(washDays(["2026-06-21", "2026-06-22"], hot, "light")).toEqual([]);
  });
});

describe("geocodeTripPlace", () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockResults(results: unknown[]) {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ results }) })));
  }

  it("keeps European results, drops the rest, and builds a comma label", async () => {
    mockResults([
      { latitude: 48.1, longitude: 11.5, name: "München", admin1: "Bavaria", country: "Germany", country_code: "DE" },
      { latitude: 40.7, longitude: -74, name: "New York", admin1: "NY", country: "United States", country_code: "US" },
    ]);
    const out = await geocodeTripPlace("m");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ lat: 48.1, lon: 11.5, short: "München", cc: "DE", label: "München, Bavaria, Germany" });
  });

  it("preserves both same-label results (the place-chip identity case)", async () => {
    mockResults([
      { latitude: 50.1, longitude: 8.1, name: "Neustadt", admin1: "Hesse", country: "Germany", country_code: "DE" },
      { latitude: 49.3, longitude: 8.1, name: "Neustadt", admin1: "Hesse", country: "Germany", country_code: "DE" },
    ]);
    const out = await geocodeTripPlace("Neustadt");
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe(out[1].label);
    // distinct coordinates are what keep them apart downstream
    expect(out[0].lat).not.toBe(out[1].lat);
  });

  it("returns [] with no results", async () => {
    mockResults([]);
    expect(await geocodeTripPlace("x")).toEqual([]);
  });
});
