// Build version — keep in sync with the SW cache (my-planner-vN). Shown in the
// footer so it's easy to confirm you're on the latest code.
const APP_VERSION = "v26";

// Defaults — the original hardcoded Munich setup. The Settings page can
// override home/office/usual-times via localStorage["planner_settings"].
const DEFAULT_PLACES = {
  home:   { label: "Riesenfeldstraße 10, München", lat: 48.1769745, lon: 11.5652835, countryCode: "DE" },
  office: { label: "Lenbachplatz 3, München",      lat: 48.1411534, lon: 11.5681888, countryCode: "DE" },
  officeArrival: { hour: 9, minute: 0 },
  homeReturn:    { hour: 18, minute: 0 },
};
function loadPlannerSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("planner_settings") || "null") || {};
    return {
      home: s.home || DEFAULT_PLACES.home,
      office: s.office || DEFAULT_PLACES.office,
      officeArrival: s.officeArrival || DEFAULT_PLACES.officeArrival,
      homeReturn: s.homeReturn || DEFAULT_PLACES.homeReturn,
    };
  } catch (e) { return DEFAULT_PLACES; }
}
const PLACES = loadPlannerSettings();

// --- Single place to tweak everything ---
const CONFIG = {
  // Coordinates from Settings (default: the hardcoded Munich addresses).
  home:   { lat: PLACES.home.lat,   lon: PLACES.home.lon,   name: PLACES.home.label },
  office: { lat: PLACES.office.lat, lon: PLACES.office.lon, name: PLACES.office.label },
  // Usual times — the reference point when routing for "tomorrow".
  officeArrival: PLACES.officeArrival,
  homeReturn:    PLACES.homeReturn,
  // Leave-by countdown color thresholds (minutes to leave).
  urgentMin: 4,
  soonMin: 8,
  // Minimum head start before a train counts as catchable — skip trains you'd
  // need to bolt for in under this many minutes (grab-bag/reaction time).
  prepBufferMin: 3,
  // Show the disruption banner when the chosen train is at least this late.
  disruptionDelayMin: 5,
  // Waking-hours window (24h) for outfit/umbrella decisions and the forecast.
  waking: { start: 8, end: 21 },
  // Auto-refresh cadence.
  refreshMs: 5 * 60 * 1000,
  // Don't show cached routes older than this — old transit times are useless.
  routeCacheMaxAgeMs: 30 * 60 * 1000,
};
const HOME = CONFIG.home;
const OFFICE = CONFIG.office;

const TRANSPORT_TYPES = "SCHIFF,RUFTAXI,BAHN,REGIONAL_BUS,UBAHN,TRAM,SBAHN,BUS";

const t = (k, p) => I18N.t(k, p);

// WMO weather code -> [wx-key, icon-category]. Label resolved per language.
const WEATHER_CODES = {
  0: ["wx.clear", "sun"],
  1: ["wx.mclear", "sun"],
  2: ["wx.pcloudy", "cloud-sun"],
  3: ["wx.overcast", "cloud"],
  45: ["wx.fog", "fog"],
  48: ["wx.fog", "fog"],
  51: ["wx.drizzleL", "rain"],
  53: ["wx.drizzle", "rain"],
  55: ["wx.drizzleD", "rain"],
  56: ["wx.fdrizzle", "rain"],
  57: ["wx.fdrizzle", "rain"],
  61: ["wx.rainL", "rain"],
  63: ["wx.rain", "rain"],
  65: ["wx.rainH", "rain"],
  66: ["wx.frain", "rain"],
  67: ["wx.frain", "rain"],
  71: ["wx.snowL", "snow"],
  73: ["wx.snow", "snow"],
  75: ["wx.snowH", "snow"],
  77: ["wx.grains", "snow"],
  80: ["wx.showers", "rain"],
  81: ["wx.showers", "rain"],
  82: ["wx.vshowers", "storm"],
  85: ["wx.sshowers", "snow"],
  86: ["wx.sshowers", "snow"],
  95: ["wx.storm", "storm"],
  96: ["wx.hail", "storm"],
  99: ["wx.hail", "storm"],
};

// Returns [wx-key, icon-category]. Caller resolves the key via t().
function weatherInfo(code) {
  return WEATHER_CODES[code] || ["wx.unknown", "cloud"];
}

// Inline SVG icon set (stroke="currentColor" so it follows theme)
const WEATHER_ICONS = {
  sun: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f5a623" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  "cloud-sun": `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3" stroke="#f5a623"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 3.5l-1 1" stroke="#f5a623"/><path d="M9 18a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 4.5 18H9z" stroke="currentColor" fill="none" transform="translate(6,2)"/></svg>`,
  cloud: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 19h10z"/></svg>`,
  fog: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 14a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.4 1.8"/><path d="M3 14h13M3 18h18M3 10h6"/></svg>`,
  rain: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 13a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 13h10z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" stroke="#4da3ff"/></svg>`,
  snow: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 13a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 13h10z"/><path d="M8 17v3M8 18.5l-1.5 1M8 18.5l1.5 1M12 17v3M12 18.5l-1.5 1M12 18.5l1.5 1M16 17v3M16 18.5l-1.5 1M16 18.5l1.5 1" stroke="#9ad6ff"/></svg>`,
  storm: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 12a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 12h10z"/><path d="M13 11l-3 4h3l-2 4" stroke="#f5a623"/></svg>`,
};

// UI icons (outline, follow theme via currentColor) — match weather icon style.
const UI_ICONS = {
  moon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
};

function weatherIcon(category, size) {
  let svg = WEATHER_ICONS[category] || WEATHER_ICONS.cloud;
  if (size) svg = svg.replace(/width="40" height="40"/, `width="${size}" height="${size}"`);
  return svg;
}

// Outfit icons — outline SVGs matching the weather icon style.
const OUTFIT_ICONS = {
  // Short-sleeve tee: stubby sleeves, wide crew neck.
  shirt: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5 5.5 5 3.5 8.5l3 1.8L8 9v12h8V9l1.5 1.3 3-1.8L18.5 5 15 3.5a3 3 0 0 1-6 0Z"/></svg>`,
  // Long-sleeve pullover: full sleeves down the sides + ribbed cuffs and neck.
  sweater: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5 4 5.5 2.5 16l2.8.6.7-7V21h12v-11.4l.7 7 2.8-.6L22 5.5 17 3.5a3 3 0 0 1-6 0Z"/><path d="M4 15.5h2.7M17.3 15.5H20M9.3 4.2 12 6.6l2.7-2.4"/></svg>`,
  // Long overcoat: collar lapels, longer body, centre button placket.
  coat: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 5 5 4 11l2.2.6V21h11.6v-9.4L20 11l-1-6-3-2-3 3-3-3Z"/><path d="M12 6.5V21M11.4 11h.01M11.4 14h.01"/></svg>`,
  umbrella: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 8 0 0 1 9 8H3a9 8 0 0 1 9-8Z"/><path d="M12 11v7a2.5 2.5 0 0 0 5 0"/><path d="M12 3V2"/></svg>`,
  // Sunglasses — shown on clear/sunny days.
  glasses: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="7" height="6" rx="3"/><rect x="14" y="10" width="7" height="6" rx="3"/><path d="M10 12.5q2-1 4 0"/><path d="M3 11 1 8.5M21 11l2-2.5"/></svg>`,
};

function outfitIcon(key) {
  if (key === "sun") return weatherIcon("sun", 36);
  return OUTFIT_ICONS[key] || "";
}

// Hourly entries for the given day, starting from "now" (today) or the start
// of waking hours (tomorrow), at a fixed step, capped to waking hours.
function hourlyEntries(data, dayIdx, count, stepH) {
  const targetDate = data.daily.time[dayIdx];
  const startHour = dayIdx === 0 ? new Date().getHours() : CONFIG.waking.start;
  const entries = [];
  for (let i = 0; i < data.hourly.time.length && entries.length < count; i++) {
    const [date, time] = data.hourly.time[i].split("T");
    if (date !== targetDate) continue;
    const hour = parseInt(time.split(":")[0], 10);
    if (hour < startHour || hour > CONFIG.waking.end) continue;
    if ((hour - startHour) % stepH !== 0) continue;
    entries.push({
      hour,
      temp: Math.round(data.hourly.temperature_2m[i]),
      rain: data.hourly.precipitation_probability[i],
      category: weatherInfo(data.hourly.weathercode[i])[1],
    });
  }
  return entries;
}

function flashIn(el) {
  el.classList.remove("fade-in");
  void el.offsetWidth;
  el.classList.add("fade-in");
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Minutes → "45 min" or "1h 5m" once it passes an hour (units localized).
function fmtMins(min) {
  if (min < 60) return `${min} ${t("dp.uMin")}`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}${t("dp.uH")} ${m}${t("dp.uM")}` : `${h}${t("dp.uH")}`;
}

function fmtDuration(ms) {
  return fmtMins(Math.round(ms / 60000));
}

async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOME.lat}&longitude=${HOME.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m` +
    `&timezone=Europe%2FBerlin&forecast_days=2`;
  const res = await fetch(url);
  return res.json();
}

async function fetchRoutes(origin, dest, dateTime) {
  const dt = dateTime.toISOString();
  const url = `https://www.mvg.de/api/bgw-pt/v3/routes?originLatitude=${origin.lat}&originLongitude=${origin.lon}` +
    `&destinationLatitude=${dest.lat}&destinationLongitude=${dest.lon}` +
    `&routingDateTime=${dt}&routingDateTimeIsArrival=false&transportTypes=${TRANSPORT_TYPES}`;
  const res = await fetch(url);
  return res.json();
}

// MVG sometimes returns fewer than 10 routes for a given time (e.g. only
// the next few unique departures). Top up by re-querying from just after
// the last departure we already have, until we hit 10 or stop gaining any.
async function fetchRoutesPadded(origin, dest, dateTime) {
  let routes = await fetchRoutes(origin, dest, dateTime);
  let attempts = 0;
  while (routes.length < 10 && routes.length > 0 && attempts < 3) {
    const last = routes[routes.length - 1];
    const lastDep = new Date(last.parts[0].from.plannedDeparture);
    lastDep.setMinutes(lastDep.getMinutes() + 1);
    let more;
    try {
      more = await fetchRoutes(origin, dest, lastDep);
    } catch (e) {
      break;
    }
    const seen = new Set(routes.map(r => r.parts[0].from.plannedDeparture + (r.parts[0].line ? r.parts[0].line.label : "")));
    let gained = 0;
    for (const r of more) {
      const key = r.parts[0].from.plannedDeparture + (r.parts[0].line ? r.parts[0].line.label : "");
      if (!seen.has(key)) {
        seen.add(key);
        routes.push(r);
        gained++;
      }
    }
    if (gained === 0) break;
    attempts++;
  }
  return routes.slice(0, 10);
}

// dayIdx: 0 = today, 1 = tomorrow. refHour/refMinute = usual departure time.
// Today always shows next available departures from now (so it works
// whether you check before or after your usual commute time).
// Tomorrow uses the fixed reference time since "now" doesn't apply yet.
function routingDateTime(dayIdx, refHour, refMinute) {
  if (dayIdx === 1) {
    const ref = new Date();
    ref.setDate(ref.getDate() + 1);
    ref.setHours(refHour, refMinute, 0, 0);
    return ref;
  }
  return new Date();
}

// Reduce an hourly field over waking hours (8am-9pm) for the given day —
// e.g. min temperature or max windspeed/rain chance, since overnight
// conditions don't affect what you wear or whether you need an umbrella.
function daytimeHourlyReduce(data, dayIdx, field, fn, init) {
  const targetDate = data.daily.time[dayIdx];
  let result = init;
  for (let i = 0; i < data.hourly.time.length; i++) {
    const [date, time] = data.hourly.time[i].split("T");
    if (date !== targetDate) continue;
    const hour = parseInt(time.split(":")[0], 10);
    if (hour >= CONFIG.waking.start && hour <= CONFIG.waking.end) {
      result = fn(result, data.hourly[field][i]);
    }
  }
  return result;
}

// Max rain chance during waking hours (8am-9pm) for the given day —
// used for the umbrella suggestion since overnight rain doesn't matter.
function daytimeRainChance(data, dayIdx) {
  return daytimeHourlyReduce(data, dayIdx, "precipitation_probability", Math.max, 0);
}

// Sunglasses suggestion needs at least this many clear waking hours, so a
// merely partly-sunny day still counts — not just a fully "sunny" daily code.
const SUNNY_HOURS = 3;

// Count clear/sunny hours during waking hours for the given day.
function daytimeSunnyHours(data, dayIdx) {
  const targetDate = data.daily.time[dayIdx];
  let hours = 0;
  for (let i = 0; i < data.hourly.time.length; i++) {
    const [date, time] = data.hourly.time[i].split("T");
    if (date !== targetDate) continue;
    const hour = parseInt(time.split(":")[0], 10);
    if (hour < CONFIG.waking.start || hour > CONFIG.waking.end) continue;
    if (weatherInfo(data.hourly.weathercode[i])[1] === "sun") hours++;
  }
  return hours;
}

function daytimeMinTemp(data, dayIdx) {
  return daytimeHourlyReduce(data, dayIdx, "temperature_2m", Math.min, Infinity);
}

// Coldest "feels like" (apparent) temp during waking hours — what the outfit
// decision should use, since wind chill/humidity change what you actually need.
function daytimeApparentMin(data, dayIdx) {
  const v = daytimeHourlyReduce(data, dayIdx, "apparent_temperature", Math.min, Infinity);
  return v == null || !isFinite(v) ? daytimeMinTemp(data, dayIdx) : v;
}

function daytimeMaxWind(data, dayIdx) {
  return daytimeHourlyReduce(data, dayIdx, "windspeed_10m", Math.max, 0);
}

function renderWeather(data, dayIdx) {
  const i = dayIdx || 0;
  const [labelKey, category] = weatherInfo(data.daily.weathercode[i]);
  const label = t(labelKey);
  const max = Math.round(data.daily.temperature_2m_max[i]);
  const min = Math.round(data.daily.temperature_2m_min[i]);
  const rain = data.daily.precipitation_probability_max[i];
  const wind = Math.round(data.daily.windspeed_10m_max[i]);

  // One-line glance strip under the header.
  const strip = document.getElementById("weatherStrip");
  strip.classList.remove("loading");
  strip.innerHTML = `
    <span class="ws-icon">${weatherIcon(category, 22)}</span>
    <span class="ws-temp">${min}° / ${max}°</span>
    <span class="ws-sep">·</span>
    <span>${label}</span>
    <span class="ws-sep">·</span>
    <span>🌧️ ${rain}%</span>
    <span>💨 ${wind} km/h</span>
    <span class="strip-chevron">⌄</span>
  `;

  // Hourly forecast card.
  const entries = hourlyEntries(data, i, 7, 2);
  const hourlyHtml = entries.map(e => `
    <div class="hour-col">
      <div class="hour-time">${e.hour}h</div>
      <div class="hour-icon">${weatherIcon(e.category, 24)}</div>
      <div class="hour-temp">${e.temp}°</div>
      <div class="hour-rain">🌧️ ${e.rain}%</div>
    </div>`).join("");
  const el = document.getElementById("weather");
  el.innerHTML = `<div class="hourly-strip">${hourlyHtml || '<div class="loading">No hourly data</div>'}</div>`;
  flashIn(el);
  return data;
}

function renderOutfit(data, dayIdx) {
  const rainProb = daytimeRainChance(data, dayIdx);
  const wind = daytimeMaxWind(data, dayIdx);
  const realMin = daytimeMinTemp(data, dayIdx);
  // Dress for what it feels like (wind chill/humidity), not the raw reading.
  const minTemp = daytimeApparentMin(data, dayIdx);

  let wearKey, wearText, jacketKey, jacketText, notes = [];

  if (minTemp < 2) {
    wearKey = "sweater";
    wearText = t("fit.thermal");
    jacketKey = "coat";
    jacketText = t("fit.bigCoat");
    notes.push(t("fit.scarf"));
  } else if (minTemp < 9) {
    wearKey = "sweater";
    wearText = t("fit.warmSweater");
    jacketKey = "coat";
    jacketText = t("fit.warmCoat");
  } else if (minTemp < 15) {
    wearKey = "shirt";
    wearText = t("fit.longSleeve");
    jacketKey = "coat";
    jacketText = t("fit.lightJacket");
  } else if (minTemp < 21) {
    wearKey = "shirt";
    wearText = t("fit.tshirtLight");
    jacketKey = "sun";
    jacketText = t("fit.noCoat");
  } else {
    wearKey = "shirt";
    wearText = t("fit.tshirt");
    jacketKey = "sun";
    jacketText = t("fit.noCoat");
  }

  // Surface the feels-like gap when it's meaningfully colder/warmer than the
  // raw temperature — explains why the outfit might look "over/under-dressed".
  if (isFinite(realMin) && isFinite(minTemp) && Math.abs(minTemp - realMin) >= 2) {
    notes.push(t("dp.feelsLike", { feels: Math.round(minTemp), actual: Math.round(realMin) }));
  }

  if (wind >= 30) {
    notes.push(t("dp.windy"));
  }

  const needsUmbrella = rainProb >= 30;
  const sunny = daytimeSunnyHours(data, dayIdx) >= SUNNY_HOURS;

  // Tiles are conditional: umbrella only when rain's likely, sunglasses on
  // clear days. Wear + Outerwear are always shown.
  const sections = [
    { icon: outfitIcon(wearKey), label: t("dp.wear"), text: wearText },
    { icon: outfitIcon(jacketKey), label: t("dp.outerwear"), text: jacketText },
  ];
  if (needsUmbrella) sections.push({ icon: outfitIcon("umbrella"), label: t("dp.umbrella"), text: t("dp.yes") });
  if (sunny) sections.push({ icon: outfitIcon("glasses"), label: t("dp.sunglasses"), text: t("dp.yes") });

  const tiles = sections.map((s) => `
      <div class="outfit-section">
        <div class="outfit-icon">${s.icon}</div>
        <div class="outfit-label">${s.label}</div>
        <div class="outfit-text">${s.text}</div>
      </div>`).join("");

  const el = document.getElementById("outfit");
  el.innerHTML = `
    <div class="outfit-sections" style="grid-template-columns:repeat(${sections.length},1fr)">${tiles}
    </div>
    ${notes.length ? `<div class="outfit-notes">${notes.join(" · ")}</div>` : ""}
  `;
  flashIn(el);
}

function summarizeRoute(route) {
  const parts = route.parts;

  // Leading walk from origin to the first station, if the route has one.
  let walk = null;
  let leadWalkMs = 0;
  if (parts[0].line && parts[0].line.transportType === "PEDESTRIAN") {
    leadWalkMs = new Date(parts[0].to.plannedDeparture) - new Date(parts[0].from.plannedDeparture);
    walk = { minutes: Math.round(leadWalkMs / 60000), dest: parts[0].to.name };
  }

  const legs = parts
    .filter(p => p.line && p.line.transportType !== "PEDESTRIAN")
    .map(p => ({
      line: p.line.label,
      transportType: p.line.transportType,
      direction: p.line.destination,
      board: p.from.name,
      alight: p.to.name,
      boardStationId: p.from.stationGlobalId,
      boardTime: p.from.plannedDeparture,
      alightTime: p.to.plannedDeparture,
      realTime: p.realTime,
      occupancy: p.occupancy || "UNKNOWN",
      delayMin: 0,        // filled by enrichRealtime()
      realtimeBoard: null,
      cancelled: false,
      warnings: [...(p.messages || []), ...(p.infos || [])]
        .map(m => (typeof m === "string" ? m : m.text || m.title || ""))
        .filter(Boolean),
    }));

  // "Leave home" = first train's board time minus the walk it takes to reach
  // the stop. MVG occasionally mis-anchors the walk's start (leaving it after
  // the train it's meant to connect to); deriving it this way keeps walk →
  // board → … always consistent. Fall back to the raw walk start otherwise.
  let departure;
  if (legs.length && leadWalkMs) {
    departure = new Date(new Date(legs[0].boardTime) - leadWalkMs).toISOString();
  } else {
    departure = parts[0].from.plannedDeparture;
  }

  const arrival = parts[parts.length - 1].to.plannedDeparture;
  const durationMs = new Date(arrival) - new Date(departure);

  return { departure, arrival, durationMs, walk, legs };
}

// Live delay of a route's first train (minutes), and effective (delay-shifted)
// times. A delay pushes both the train and your leave-home time back equally.
function routeDelayMs(s) {
  const leg = s.legs[0];
  return leg && leg.delayMin ? leg.delayMin * 60000 : 0;
}
function effDepartureMs(s) {
  return new Date(s.departure).getTime() + routeDelayMs(s);
}
function effBoardMs(s) {
  const leg = s.legs[0];
  const planned = leg ? new Date(leg.boardTime).getTime() : new Date(s.departure).getTime();
  return planned + routeDelayMs(s);
}
function routeCancelled(s) {
  return s.legs.some((l) => l.cancelled);
}

// Enrich summaries with live delays from the /departures endpoint, matched by
// line + planned time at each route's first station. One call per distinct
// station (usually 1-2), so cheap. Mutates the leg objects in place.
async function enrichRealtime(summaries) {
  const byStation = {};
  for (const s of summaries) {
    const leg = s.legs[0];
    if (!leg || !leg.boardStationId) continue;
    (byStation[leg.boardStationId] = byStation[leg.boardStationId] || []).push(leg);
  }
  await Promise.all(Object.keys(byStation).map(async (gid) => {
    try {
      const deps = await fetch(
        `https://www.mvg.de/api/bgw-pt/v3/departures?globalId=${encodeURIComponent(gid)}&limit=60`
      ).then((r) => r.json());
      for (const leg of byStation[gid]) {
        const plannedMs = new Date(leg.boardTime).getTime();
        const m = deps.find((x) =>
          x.label === leg.line && Math.abs(x.plannedDepartureTime - plannedMs) < 60000
        );
        if (m) {
          leg.delayMin = m.delayInMinutes || 0;
          leg.realtimeBoard = m.realtimeDepartureTime ? new Date(m.realtimeDepartureTime).toISOString() : null;
          leg.cancelled = !!m.cancelled;
          leg.realTime = true;
          if (m.occupancy) leg.occupancy = m.occupancy;
        }
      }
    } catch (e) {}
  }));
}

// Official MVG line colors. Keyed by exact line label; fall back to a
// per-transport-type default for anything not listed (e.g. bus numbers).
const LINE_COLORS = {
  U1: "#438136", U2: "#C40C37", U3: "#ED6720", U4: "#00A984",
  U5: "#BC7A00", U6: "#0065AE", U7: "#C40C37", U8: "#ED6720",
  S1: "#16BAE7", S2: "#76B82A", S3: "#951B81", S4: "#E30613",
  S6: "#00975F", S7: "#943126", S8: "#000000", S20: "#ED6720",
};
const TYPE_COLORS = {
  UBAHN: "#0065AE", SBAHN: "#00975F", TRAM: "#E2001A",
  BUS: "#00586A", REGIONAL_BUS: "#00586A", BAHN: "#5b6770",
};
// Deep link to Google Maps transit directions for the current direction.
function mapsUrlFor(direction) {
  const o = direction === "office" ? CONFIG.home : CONFIG.office;
  const d = direction === "office" ? CONFIG.office : CONFIG.home;
  return `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lon}` +
    `&destination=${d.lat},${d.lon}&travelmode=transit`;
}
let lastSwipeAt = 0;
function openRoute() {
  if (Date.now() - lastSwipeAt < 400) return; // ignore the tap a swipe leaves behind
  window.open(mapsUrlFor(selectedDirection), "_blank", "noopener");
}

// Crowding badge for a leg's occupancy; empty when unknown.
const OCCUPANCY = { LOW: ["occ-low", "dp.quiet"], MEDIUM: ["occ-med", "dp.busy"], HIGH: ["occ-high", "dp.packed"] };
function occupancyTag(level) {
  const o = OCCUPANCY[level];
  return o ? `<span class="occupancy ${o[0]}">● ${t(o[1])}</span>` : "";
}

function lineColor(line, type) {
  if (LINE_COLORS[line]) return LINE_COLORS[line];
  // Munich line-family conventions for anything without an explicit color.
  if (/^N\d/i.test(line)) return "#2b2d42";  // night lines (NachtTram/NachtBus)
  if (/^X\d/i.test(line)) return "#6a1b9a";  // express buses
  if (/^5[0-9]$|^6[0-8]$/.test(line)) return "#004f6e"; // MetroBus (50–68), bolder blue
  return TYPE_COLORS[type] || "#5b6770";
}

// Color tier for a "minutes from now" value: urgent (red) / soon (amber) / ok.
function leaveTier(diffMin) {
  if (diffMin <= CONFIG.urgentMin) return "urgent";
  if (diffMin <= CONFIG.soonMin) return "soon";
  return "ok";
}

// The departure you'd actually take: first one whose leave-home time is at
// least prepBufferMin away (you can realistically still make it). If none
// qualify (you're too late), fall back to the last — shown as "now".
function pickChosen(summaries, now) {
  const cutoffMs = now.getTime() + CONFIG.prepBufferMin * 60000;
  let chosen = summaries[summaries.length - 1];
  for (const s of summaries) {
    if (routeCancelled(s)) continue; // never recommend a cancelled train
    if (effDepartureMs(s) > cutoffMs) { chosen = s; break; }
  }
  return chosen;
}

// Shimmer placeholders shown while data loads.
const SKELETON = {
  routes: '<div class="skeleton skel-row"></div>'.repeat(4),
  outfit: '<div class="skel-grid3">' + '<div class="skeleton skel-tile"></div>'.repeat(3) + "</div>",
  weather: '<div class="skel-strip">' + '<div class="skeleton"></div>'.repeat(5) + "</div>",
};

function showRoutesError() {
  document.getElementById("routesList").innerHTML =
    `<div class="loading">${t("dp.couldntRoutes")}<button class="retry-btn" onclick="loadRoutes(selectedDay)">${t("dp.retry")}</button></div>`;
  document.getElementById("showMoreBtn").style.display = "none";
}

function renderRoutes(elementId, summaries, count) {
  if (!summaries.length) {
    document.getElementById(elementId).innerHTML = `<div class="loading">${t("dp.noDepartures")}</div>`;
    const empty = document.getElementById("routesEmpty");
    if (empty) empty.style.display = "none";
    const more = document.getElementById("showMoreBtn");
    if (more) more.style.display = "none";
    return;
  }
  const shown = summaries.slice(0, count);
  const html = shown.map(s => {
    const legsHtml = s.legs.length
      ? `<div class="route-legs">` + s.legs.map(l => {
          const meta = [
            l.realTime ? `<span class="route-livetag">● ${t("dp.live")}</span>` : "",
            occupancyTag(l.occupancy),
          ].filter(Boolean).join(" ");
          return `
            <div class="leg-line">
              <span class="route-line" style="background:${lineColor(l.line, l.transportType)}">${l.line}</span> → ${l.direction}
              ${meta ? `<span class="leg-meta">${meta}</span>` : ""}
            </div>
            <div class="leg-stop"><i class="dot"></i><span class="route-station">${fmtTime(l.boardTime)} ${l.board}</span></div>
            <div class="leg-stop"><i class="dot end"></i><span class="route-station">${fmtTime(l.alightTime)} ${l.alight}</span></div>
            ${l.warnings.map(w => `<div class="route-warning">⚠️ ${w}</div>`).join("")}`;
        }).join("") + `</div>`
      : `<div class="route-leg">${t("dp.noWalk")}</div>`;
    const walkHtml = s.walk
      ? `<div class="route-walk">🚶 ${t("dp.walkTo", { min: s.walk.minutes, dest: s.walk.dest })}</div>`
      : "";
    // Route-level disruption flag: any leg carrying a warning/info message.
    const allWarnings = s.legs.flatMap(l => l.warnings);
    const alertHtml = allWarnings.length
      ? `<div class="route-alert">⚠️ ${allWarnings[0]}${allWarnings.length > 1 ? ` (+${allWarnings.length - 1} more)` : ""}</div>`
      : "";
    const delayM = s.legs[0] ? s.legs[0].delayMin : 0;
    const cancelled = routeCancelled(s);
    const delayTag = cancelled
      ? `<span class="delay-tag cancel">${t("dp.cancelled")}</span>`
      : delayM > 0 ? `<span class="delay-tag">${t("dp.minLate", { n: delayM })}</span>` : "";
    return `
      <div class="route" data-departure="${s.departure}" data-delay="${delayM}" onclick="selectRoute('${s.departure}')" onkeydown="if(event.key==='Enter')selectRoute('${s.departure}')" role="button" tabindex="0" title="${t("dp.catchThis")}">
        <div class="route-time"><span class="route-num"></span>${fmtTime(s.departure)} → ${fmtTime(s.arrival)} (${fmtDuration(s.durationMs)})${delayTag}<span class="route-rel"></span></div>
        ${alertHtml}
        ${walkHtml}
        ${legsHtml}
        <div class="route-actions">
          <button type="button" class="route-map" title="${t("dp.openMaps")}" aria-label="${t("dp.openMaps")}" onclick="event.stopPropagation();openRoute()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${t("dp.openMaps")}
          </button>
        </div>
      </div>`;
  }).join("");
  const el = document.getElementById(elementId);
  el.innerHTML = html;
  flashIn(el);

  const moreBtn = document.getElementById("showMoreBtn");
  moreBtn.style.display = summaries.length > count ? "" : "none";

  refreshRouteLive();
}

// Live per-row overlay (today only): relative "in X min" countdown + highlight
// the departure the Time-to-Go card picked. Cheap DOM update, runs on the tick.
function refreshRouteLive() {
  const list = document.getElementById("routesList");
  if (!list) return;
  const emptyEl = document.getElementById("routesEmpty");
  const rows = list.querySelectorAll(".route");
  if (!rows.length) { if (emptyEl) emptyEl.style.display = "none"; return; }

  const summaries = routeCache[selectedDirection];
  const now = new Date();
  const live = selectedDay === 0 && summaries && summaries.length;
  const chosenDep = live ? chosenSummary(summaries, now).departure : null;

  let visibleNum = 0;
  let chosenMarked = false; // only the first row at the chosen time is highlighted
  rows.forEach((row) => {
    const dep = row.getAttribute("data-departure");
    const delayMs = (parseInt(row.getAttribute("data-delay"), 10) || 0) * 60000;
    const rel = row.querySelector(".route-rel");
    const num = row.querySelector(".route-num");
    if (live && dep) {
      // Effective leave-home = planned + live delay.
      const diffExact = (new Date(dep).getTime() + delayMs - now) / 60000;
      const diff = Math.round(diffExact);
      // Drop rows whose leave time has passed — old options are just clutter.
      if (diffExact < 0) {
        row.style.display = "none";
        row.classList.remove("chosen");
        if (num) num.textContent = "";
        return;
      }
      row.style.display = "";
      if (rel) {
        if (diff === 0) { rel.textContent = " · " + t("dp.now"); rel.className = "route-rel " + leaveTier(0); }
        else { rel.textContent = ` · ${fmtMins(diff)}`; rel.className = "route-rel " + leaveTier(diff); }
      }
      const isChosen = !chosenMarked && dep === chosenDep;
      if (isChosen) chosenMarked = true;
      row.classList.toggle("chosen", isChosen);
    } else {
      row.style.display = "";
      if (rel) { rel.textContent = ""; rel.className = "route-rel"; }
      row.classList.remove("chosen");
    }
    if (num) num.textContent = ++visibleNum;
  });

  // All options have departed (stale data / late night) — show a friendly note.
  if (emptyEl) emptyEl.style.display = (live && visibleNum === 0) ? "" : "none";
}

let weatherData = null;
let selectedDay = 0; // 0 = today, 1 = tomorrow
// Morning you're heading to the office; from ~13:00 you're heading home.
function defaultDirection() {
  const h = new Date().getHours();
  return h >= 13 && h < 24 ? "home" : "office";
}
// A PWA shortcut (?to=office|home) overrides the time-based default.
function initialDirection() {
  const to = new URLSearchParams(window.location.search).get("to");
  return to === "home" || to === "office" ? to : defaultDirection();
}
let selectedDirection = initialDirection(); // "home" or "office" — master toggle
let visibleCount = 5;
let routeCache = { home: null, office: null };
let enriched = { home: false, office: false }; // live delays applied this load?

// --- User-picked departure + leave reminder (today only) ---
// userPick overrides the auto-pickChosen for the Time-to-Go card.
let userPick = JSON.parse(localStorage.getItem("user_pick") || "null");      // {dir, departure}
let reminder = JSON.parse(localStorage.getItem("leave_reminder") || "null"); // {dir, departure, leaveTs, label}
let reminderTimer = null;
const canNotify = "Notification" in window;

// The departure the Time-to-Go card should use: the user's pick (while still
// catchable) wins; otherwise the automatic choice.
function chosenSummary(summaries, now) {
  if (userPick && userPick.dir === selectedDirection) {
    const m = summaries.find((s) => s.departure === userPick.departure);
    if (m && effDepartureMs(m) > now.getTime() - 60000) return m;
  }
  return pickChosen(summaries, now);
}

// Tapping a route row picks it for the Time-to-Go card (↗ opens the map).
function selectRoute(departure) {
  if (Date.now() - lastSwipeAt < 400) return; // ignore tap left by a swipe
  userPick = { dir: selectedDirection, departure };
  localStorage.setItem("user_pick", JSON.stringify(userPick));
  if (reminder && reminder.departure !== departure) clearReminder();
  updateLeaveBy();
  refreshRouteLive();
  document.getElementById("leaveByCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Back to the automatic pick; drops any armed reminder.
function resetChosen() {
  userPick = null;
  localStorage.removeItem("user_pick");
  clearReminder();
  updateLeaveBy();
  refreshRouteLive();
}

function clearReminder() {
  reminder = null;
  localStorage.removeItem("leave_reminder");
  clearTimeout(reminderTimer);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.getNotifications) {
        reg.getNotifications({ tag: "leave-reminder", includeTriggered: true })
          .then((ns) => ns.forEach((n) => n.close())).catch(() => {});
      }
    });
  }
}

// Arm/disarm a "time to leave" notification for the chosen departure.
async function toggleReminder() {
  if (reminder) { clearReminder(); updateLeaveBy(); return; }
  const summaries = routeCache[selectedDirection];
  if (!summaries || !summaries.length) return;
  const chosen = chosenSummary(summaries, new Date());
  const leaveTs = effDepartureMs(chosen);
  if (leaveTs <= Date.now()) { alert(t("dp.permTrip")); return; }
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") { alert(t("dp.permAsk")); return; }
  const line = chosen.legs[0] ? chosen.legs[0].line : "walk";
  const board = fmtTime(new Date(effBoardMs(chosen)).toISOString());
  const label = t("dp.leaveBody", { origin: t(selectedDirection === "office" ? "dp.home" : "dp.office"), line, time: board });
  reminder = { dir: selectedDirection, departure: chosen.departure, leaveTs, label, line, lastDelay: chosen.legs[0] ? chosen.legs[0].delayMin : 0 };
  localStorage.setItem("leave_reminder", JSON.stringify(reminder));
  await scheduleReminder(reminder);
  updateLeaveBy();
}

// Schedule the notification. Notification Triggers fire even when the app is
// closed (Android/Chrome); elsewhere (iOS) fall back to a timer while alive.
async function scheduleReminder(r) {
  clearTimeout(reminderTimer);
  let triggered = false;
  if ("serviceWorker" in navigator && "showTrigger" in Notification.prototype && "TimestampTrigger" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(t("dp.leaveTitle"), {
        body: r.label, tag: "leave-reminder", icon: "icon-192.png", badge: "icon-192.png",
        requireInteraction: true, showTrigger: new TimestampTrigger(r.leaveTs),
      });
      triggered = true;
    } catch (e) { triggered = false; }
  }
  if (!triggered) {
    const ms = r.leaveTs - Date.now();
    if (ms > 0 && ms < 0x7fffffff) {
      reminderTimer = setTimeout(() => { fireNow(r); clearReminder(); }, ms);
    }
  }
}

// Show a notification immediately. Prefer the SW registration (the only path
// iOS supports); fall back to the Notification constructor elsewhere.
async function notify(title, body, tag) {
  if (!canNotify || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, icon: "icon-192.png", badge: "icon-192.png", tag: tag || "planner", requireInteraction: true });
  } catch (e) {
    try { new Notification(title, { body, icon: "icon-192.png", tag }); } catch (_) {}
  }
}
function fireNow(r) { notify(t("dp.leaveTitle"), r.label, "leave-reminder"); }

// Point an armed reminder at a different departure (e.g. after a cancellation).
function repointReminder(s) {
  const line = s.legs[0] ? s.legs[0].line : "walk";
  userPick = { dir: selectedDirection, departure: s.departure };
  localStorage.setItem("user_pick", JSON.stringify(userPick));
  reminder = {
    dir: selectedDirection, departure: s.departure, leaveTs: effDepartureMs(s),
    lastDelay: s.legs[0] ? s.legs[0].delayMin : 0, line,
    label: t("dp.leaveBody", { origin: t(selectedDirection === "office" ? "dp.home" : "dp.office"), line, time: fmtTime(new Date(effBoardMs(s)).toISOString()) }),
  };
  localStorage.setItem("leave_reminder", JSON.stringify(reminder));
  scheduleReminder(reminder);
}

// While a reminder is armed, watch the chosen train: alert + re-aim if it gets
// cancelled, or shift the leave time (and alert) when it's newly delayed.
function checkDisruption() {
  if (!reminder || reminder.dir !== selectedDirection) return;
  const summaries = routeCache[selectedDirection];
  if (!summaries || !summaries.length) return;
  const now = new Date();
  const s = summaries.find((x) => x.departure === reminder.departure);

  if (!s || routeCancelled(s)) {
    const next = pickChosen(summaries, now);
    if (next && !routeCancelled(next) && next.departure !== reminder.departure) {
      const oldLine = reminder.line || t("dp.yourTrain");
      const nextLine = next.legs[0] ? next.legs[0].line : "next";
      const board = fmtTime(new Date(effBoardMs(next)).toISOString());
      const leave = fmtTime(new Date(effDepartureMs(next)).toISOString());
      repointReminder(next);
      notify(t("dp.cancelTitle"), t("dp.cancelBody", { old: oldLine, line: nextLine, board, leave }), "leave-reminder");
    }
    return;
  }

  const delay = s.legs[0] ? s.legs[0].delayMin : 0;
  const newLeave = effDepartureMs(s);
  if (Math.abs(newLeave - reminder.leaveTs) > 60000) {
    const wasDelay = reminder.lastDelay || 0;
    reminder.leaveTs = newLeave;
    reminder.lastDelay = delay;
    reminder.line = s.legs[0] ? s.legs[0].line : reminder.line;
    localStorage.setItem("leave_reminder", JSON.stringify(reminder));
    scheduleReminder(reminder);
    if (delay >= CONFIG.disruptionDelayMin && delay > wasDelay) {
      notify(t("dp.lateTitle"), t("dp.lateBody", { line: reminder.line, n: delay, time: fmtTime(new Date(newLeave).toISOString()) }), "leave-reminder");
    }
  }
}

// Toggle a segmented button's active state + its aria-pressed.
function setToggle(id, on) {
  const btn = document.getElementById(id);
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
}

// Trim a saved address label to its first part (street) for a compact title.
function shortPlace(name) {
  return (name || "").split(",")[0].trim();
}
function dayLabel(dayIdx) { return t(dayIdx === 0 ? "dp.today" : "dp.tomorrow"); }
function routesTitleFor(direction, dayIdx) {
  const day = dayLabel(dayIdx);
  return direction === "home"
    ? t("dp.toHome", { place: shortPlace(CONFIG.home.name), day })
    : t("dp.toOffice", { place: shortPlace(CONFIG.office.name), day });
}

// Update the compact day stepper: day name, real date, and arrow bounds.
function updateDayStepper(dayIdx) {
  const d = new Date();
  d.setDate(d.getDate() + dayIdx);
  document.getElementById("dayName").textContent = dayLabel(dayIdx);
  document.getElementById("dayDate").textContent =
    d.toLocaleDateString(I18N.dateLocale(), { weekday: "short", day: "numeric", month: "short" });
  document.getElementById("dayPrev").disabled = dayIdx === 0;
  document.getElementById("dayNext").disabled = dayIdx === 1;
}

// Step the day within [0, 1] (today..tomorrow).
function stepDay(delta) {
  const next = Math.min(1, Math.max(0, selectedDay + delta));
  if (next !== selectedDay) selectDay(next);
}

function selectDay(dayIdx) {
  selectedDay = dayIdx;
  updateDayStepper(dayIdx);
  document.getElementById("outfitTitle").textContent = t("dp.outfitFor", { day: dayLabel(dayIdx) });
  document.getElementById("routesTitle").textContent = routesTitleFor(selectedDirection, dayIdx);

  if (weatherData) {
    renderWeather(weatherData, dayIdx);
    renderOutfit(weatherData, dayIdx);
  }
  refreshDayOff();
  loadRoutes(dayIdx);
}

function selectDirection(direction) {
  selectedDirection = direction;
  visibleCount = 5;
  setToggle("btnDirHome", direction === "home");
  setToggle("btnDirOffice", direction === "office");
  document.getElementById("routesTitle").textContent = routesTitleFor(direction, selectedDay);

  const cached = routeCache[direction];
  if (cached) {
    renderRoutes("routesList", cached, visibleCount);
    // First time we show this direction today, pull its live delays.
    if (!enriched[direction] && selectedDay === 0) {
      enrichRealtime(cached).then(() => {
        enriched[direction] = true;
        if (selectedDirection === direction) {
          renderRoutes("routesList", cached, visibleCount);
          updateLeaveBy();
        }
      });
    }
  } else {
    document.getElementById("routesList").innerHTML = SKELETON.routes;
    document.getElementById("showMoreBtn").style.display = "none";
  }
  updateLeaveBy();
  renderStaleNote();
}

function showMoreRoutes() {
  visibleCount = 10;
  const cached = routeCache[selectedDirection];
  if (cached) renderRoutes("routesList", cached, visibleCount);
}

// Static "tomorrow" plan: first train around your usual time, no live countdown.
function renderTomorrowPlan(summaries) {
  const card = document.getElementById("leaveByCard");
  card.style.display = "block";
  document.getElementById("disruptionBanner").style.display = "none";
  leaveActive = false;
  updateLeaveBar();

  const origin = t(selectedDirection === "office" ? "dp.home" : "dp.office");
  const dest = t(selectedDirection === "office" ? "dp.toWork" : "dp.goingHome");
  document.getElementById("leaveByTitle").textContent = `${t("dp.tomorrow")} — ${dest}`;

  const s = summaries[0];
  const leaveTime = new Date(s.departure);
  const board = s.legs[0] ? new Date(s.legs[0].boardTime) : leaveTime;
  const line = s.legs[0] ? s.legs[0].line : "walk";

  const el = document.getElementById("leaveBy");
  el.innerHTML = `
    <div class="leave-grid">
      <div class="leave-col">
        <div class="leave-label">${t("dp.leaveAt", { origin })}</div>
        <div class="leave-clock">${fmtTime(leaveTime.toISOString())}</div>
        <div class="leave-plan">${t("dp.aroundTime")}</div>
      </div>
      <div class="leave-col">
        <div class="leave-label">${t("dp.firstTrain", { line })}</div>
        <div class="leave-clock">${fmtTime(board.toISOString())}</div>
        <div class="leave-plan">${t("dp.planningAhead")}</div>
      </div>
    </div>
    <div class="leave-sub">${s.walk ? t("dp.walkTo", { min: s.walk.minutes, dest: s.walk.dest }) : t("dp.noWalk")} · ${t("dp.tomorrow")}</div>
  `;
  flashIn(el);
}

function updateLeaveBy() {
  const card = document.getElementById("leaveByCard");
  // Follows the master direction toggle: "office" = leave home → office,
  // "home" = leave office → home. Live countdown only makes sense today.
  const summaries = routeCache[selectedDirection];
  const off = dayOffInfo(selectedDay);
  const noData = !summaries || !summaries.length;
  // Day off hides it (unless today + the "heading out" toggle); no data hides it.
  if (noData || (off && !(selectedDay === 0 && showLeaveOnDayOff))) {
    card.style.display = "none";
    leaveActive = false;
    updateLeaveBar();
    document.getElementById("disruptionBanner").style.display = "none";
    return;
  }
  // Tomorrow (workday) → static plan, no live countdown.
  if (selectedDay === 1) {
    renderTomorrowPlan(summaries);
    return;
  }
  card.style.display = "block";
  const now = new Date();

  // If a reminder's armed, react to cancellations/delays before we render.
  checkDisruption();

  const origin = t(selectedDirection === "office" ? "dp.home" : "dp.office");
  document.getElementById("leaveByTitle").textContent =
    `${t("dp.timeToGo")} — ${t(selectedDirection === "office" ? "dp.toWork" : "dp.goingHome")}`;

  const chosen = chosenSummary(summaries, now);

  // Effective (live, delay-shifted) times: leaving and the train departure.
  const leaveTime = new Date(effDepartureMs(chosen));
  const departTime = new Date(effBoardMs(chosen));
  const delayMin = chosen.legs[0] ? chosen.legs[0].delayMin : 0;

  const leaveDiff = Math.round((leaveTime - now) / 60000);
  const departDiff = Math.round((departTime - now) / 60000);

  const lineLabel = chosen.legs[0] ? chosen.legs[0].line : "walk";
  let depLabel = t("dp.departure", { line: lineLabel });
  if (chosen.legs[0] && chosen.legs[0].cancelled) depLabel += ` ✖ ${t("dp.cancelled")}`;
  else if (delayMin > 0) depLabel += ` · <span class="delay-tag">${t("dp.minLate", { n: delayMin })}</span>`;

  function countdownText(diffMin) {
    if (diffMin <= 0) return [t("dp.now"), leaveTier(diffMin)];
    return [fmtMins(diffMin), leaveTier(diffMin)];
  }

  function leaveCountdownText(diffMin) {
    if (diffMin <= 0) return [t("dp.leaveNow"), leaveTier(diffMin)];
    return [t("dp.leaveIn", { t: fmtMins(diffMin) }), leaveTier(diffMin)];
  }

  const [leaveText, leaveLevel] = leaveCountdownText(leaveDiff);
  const [departText, departLevel] = countdownText(departDiff);
  const reminderArmed = !!reminder && reminder.dir === selectedDirection && reminder.departure === chosen.departure;

  const el = document.getElementById("leaveBy");
  el.innerHTML = `
    <div class="leave-grid">
      <div class="leave-col">
        <div class="leave-label">${t("dp.leaveAt", { origin })}</div>
        <div class="leave-clock">${fmtTime(leaveTime.toISOString())}</div>
        <div class="leave-countdown highlight ${leaveLevel}">${leaveText}</div>
      </div>
      <div class="leave-col">
        <div class="leave-label">${depLabel}</div>
        <div class="leave-clock">${fmtTime(departTime.toISOString())}</div>
        <div class="leave-countdown ${departLevel}">${departText}</div>
      </div>
    </div>
    <div class="leave-sub">${chosen.walk ? t("dp.walkTo", { min: chosen.walk.minutes, dest: chosen.walk.dest }) : t("dp.noWalk")}${userPick && userPick.dir === selectedDirection ? ` · ${t("dp.yourPick")}` : ""}</div>
    <div class="leave-controls">
      ${canNotify ? `<button class="leave-btn ${reminderArmed ? "on" : ""}" onclick="toggleReminder()">${reminderArmed ? t("dp.reminderOn") : t("dp.remindMe")}</button>` : ""}
      ${userPick && userPick.dir === selectedDirection ? `<button class="leave-btn ghost" onclick="resetChosen()">${t("dp.default")}</button>` : ""}
    </div>
  `;
  flashIn(el);

  // Disruption banner: flag the chosen train when it's cancelled, badly late,
  // or carries a service message — so you catch it without scrolling.
  const banner = document.getElementById("disruptionBanner");
  const warns = chosen.legs.flatMap((l) => l.warnings);
  let bMsg = "", bLevel = "warn";
  if (routeCancelled(chosen)) { bMsg = `⚠ ${lineLabel} ${t("dp.cancelled")}`; bLevel = "bad"; }
  else if (delayMin >= CONFIG.disruptionDelayMin) { bMsg = `⚠ ${lineLabel} ${t("dp.minLate", { n: delayMin })}`; bLevel = "warn"; }
  else if (warns.length) { bMsg = `⚠ ${warns[0]}`; bLevel = "warn"; }
  if (bMsg) {
    banner.textContent = bMsg;
    banner.className = "disruption-banner " + bLevel;
    banner.style.display = "block";
  } else {
    banner.style.display = "none";
  }

  // Feed the slim sticky bar (shown when this card is scrolled out of view).
  const dirIcon = selectedDirection === "office" ? "🏢" : "🏠";
  leaveActive = true;
  leaveBarHtml = `<span>${dirIcon}</span><span>${t("dp.leaveAt", { origin: "" }).trim()} ${fmtTime(leaveTime.toISOString())}</span>` +
    `<span class="lb-count ${leaveLevel}">· ${leaveText}</span>` +
    `<span class="lb-sub">${lineLabel} ${fmtTime(departTime.toISOString())}</span>`;
  updateLeaveBar();
}

// --- Slim "leave by" bar that appears once the full card scrolls away ---
let leaveBarHtml = "";
let leaveActive = false;
let leaveCardVisible = true;
function updateLeaveBar() {
  const bar = document.getElementById("leaveBar");
  if (!bar) return;
  bar.innerHTML = leaveBarHtml;
  bar.style.display = (leaveActive && !leaveCardVisible) ? "flex" : "none";
}

// --- Route cache (localStorage) for offline fallback ---
const ROUTE_CACHE_KEY = "planner_routes_cache";
let liveLoaded = { home: false, office: false };
let routeCacheSavedAt = 0;

function loadRouteCache(dayIdx) {
  try {
    const o = JSON.parse(localStorage.getItem(ROUTE_CACHE_KEY) || "null");
    if (!o || o.dayIdx !== dayIdx) return null;
    if (Date.now() - o.savedAt > CONFIG.routeCacheMaxAgeMs) return null;
    return o; // { dayIdx, savedAt, routes: {home, office} }
  } catch (e) {
    return null;
  }
}

function saveRouteCache(dayIdx) {
  if (!liveLoaded.home && !liveLoaded.office) return; // never persist stale-only
  try {
    localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify({
      dayIdx, savedAt: Date.now(), routes: routeCache,
    }));
  } catch (e) {}
}

// Shows "showing routes from HH:MM" when the displayed direction is cache-only.
function renderStaleNote() {
  const el = document.getElementById("routesStale");
  const stale = !liveLoaded[selectedDirection] && routeCache[selectedDirection] && routeCacheSavedAt;
  if (stale) {
    el.textContent = t("dp.offlineFrom", { time: fmtTime(new Date(routeCacheSavedAt).toISOString()) });
    el.style.display = "";
  } else {
    el.style.display = "none";
  }
}

async function loadRoutes(dayIdx) {
  routeCache = { home: null, office: null };
  liveLoaded = { home: false, office: false };
  enriched = { home: false, office: false };
  routeCacheSavedAt = 0;
  visibleCount = 5;

  // Seed from cache (if fresh enough) so something shows instantly / offline.
  const cached = loadRouteCache(dayIdx);
  if (cached) {
    routeCache = cached.routes;
    routeCacheSavedAt = cached.savedAt;
    if (routeCache[selectedDirection]) renderRoutes("routesList", routeCache[selectedDirection], visibleCount);
    updateLeaveBy();
    renderStaleNote();
  } else {
    updateLeaveBy();
    document.getElementById("routesList").innerHTML = SKELETON.routes;
    document.getElementById("showMoreBtn").style.display = "none";
  }

  const fetchDir = async (dir, origin, dest, ref) => {
    try {
      const time = routingDateTime(dayIdx, ref.hour, ref.minute);
      const routes = await fetchRoutesPadded(origin, dest, time);
      routeCache[dir] = routes.map(r => summarizeRoute(r));
      liveLoaded[dir] = true;
      if (selectedDirection === dir) {
        renderRoutes("routesList", routeCache[dir], visibleCount);
        updateLeaveBy();
        renderStaleNote();
      }
      // Overlay live delays for the visible direction (today only), then redraw.
      if (selectedDirection === dir && dayIdx === 0) {
        await enrichRealtime(routeCache[dir]);
        enriched[dir] = true;
        if (selectedDirection === dir) {
          renderRoutes("routesList", routeCache[dir], visibleCount);
          updateLeaveBy();
        }
      }
    } catch (e) {
      // Keep any cached rows on screen; only show failure if we have nothing.
      if (selectedDirection === dir && !routeCache[dir]) {
        showRoutesError();
      }
    }
  };

  const fetchHome = () => fetchDir("home", OFFICE, HOME, CONFIG.homeReturn);
  const fetchOffice = () => fetchDir("office", HOME, OFFICE, CONFIG.officeArrival);

  // Load the currently-selected direction first so it appears sooner.
  if (selectedDirection === "home") {
    await fetchHome();
    await fetchOffice();
  } else {
    await fetchOffice();
    await fetchHome();
  }

  saveRouteCache(dayIdx);
  lastUpdatedAt = Date.now();
  renderUpdated();
}

// --- Bavarian public holidays (Nager.Date), cached ~30 days ---
let holidayMap = {}; // "YYYY-MM-DD" -> holiday name
function localYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
async function loadHolidays(year) {
  const key = `holidays_DE_BY_${year}`;
  try {
    const c = JSON.parse(localStorage.getItem(key) || "null");
    if (c && Date.now() - c.savedAt < 30 * 24 * 3600 * 1000) return c.dates;
  } catch (e) {}
  try {
    const all = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/DE`).then((r) => r.json());
    // National holidays (counties null) plus those that include Bavaria.
    const dates = {};
    for (const h of all) {
      if (!h.counties || h.counties.includes("DE-BY")) dates[h.date] = h.localName || h.name;
    }
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), dates }));
    return dates;
  } catch (e) {
    return {};
  }
}

// Quip i18n keys; resolved (with the holiday name) when a day-off is shown.
const WEEKEND_QUIPS = ["dp.we1", "dp.we2", "dp.we3", "dp.we4", "dp.we5"];
const HOLIDAY_QUIPS = ["dp.ho1", "dp.ho2", "dp.ho3"];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Returns null on a working day, else a (funny) reason this day is off.
function dayOffInfo(dayIdx) {
  const d = new Date();
  d.setDate(d.getDate() + dayIdx);
  const dow = d.getDay();
  const name = holidayMap[localYmd(d)];
  if (name) return { holiday: true, name };
  if (dow === 0 || dow === 6) return { holiday: false };
  return null;
}

let showLeaveOnDayOff = false; // reveal the leave-by on a day off if heading out
let dayOffMsg = "";            // keep the quip stable across re-renders this load
function refreshDayOff() {
  const note = document.getElementById("dayOffNote");
  const info = dayOffInfo(selectedDay);
  if (!info) { note.style.display = "none"; dayOffMsg = ""; return; }
  if (!dayOffMsg) dayOffMsg = info.holiday ? t(pick(HOLIDAY_QUIPS), { n: info.name }) : t(pick(WEEKEND_QUIPS));
  note.innerHTML = `<div>${dayOffMsg}</div>` +
    `<button class="dayoff-toggle" onclick="toggleLeaveOnDayOff()">` +
    `${showLeaveOnDayOff ? t("dp.hideTimes") : t("dp.headingOut")}</button>`;
  note.style.display = "block";
}

function toggleLeaveOnDayOff() {
  showLeaveOnDayOff = !showLeaveOnDayOff;
  updateLeaveBy();
  refreshDayOff();
}

// "Updated just now / N min ago" with an amber tint once data is stale.
let lastUpdatedAt = 0;
function renderUpdated() {
  const el = document.getElementById("updated");
  if (!lastUpdatedAt) { el.textContent = ""; return; }
  const mins = Math.floor((Date.now() - lastUpdatedAt) / 60000);
  const when = mins < 1 ? t("dp.updatedNow") : t("dp.updatedAgo", { t: fmtMins(mins) });
  el.textContent = `${when} · ${APP_VERSION}`;
  el.classList.toggle("stale", mins >= 6);
}

setInterval(() => { updateLeaveBy(); refreshRouteLive(); renderUpdated(); }, 15000);

// --- Theme toggle ---

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Show the icon for the mode you'd switch TO.
  document.getElementById("themeToggle").innerHTML = theme === "light" ? UI_ICONS.moon : UI_ICONS.sun;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  localStorage.setItem("theme", next);
  applyTheme(next);
}

applyTheme(localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));

// --- Hourly forecast: collapsible under the weather strip ---
function setHourly(open) {
  document.getElementById("hourlyWrap").style.display = open ? "block" : "none";
  document.getElementById("weatherStrip").setAttribute("aria-expanded", open ? "true" : "false");
  document.getElementById("weatherStrip").classList.toggle("open", open);
}
function toggleHourly() {
  const open = document.getElementById("hourlyWrap").style.display === "none";
  localStorage.setItem("hourly_open", open ? "1" : "0");
  setHourly(open);
}
setHourly(localStorage.getItem("hourly_open") === "1"); // default collapsed

// Nuke all caches + service workers and reload fresh. Escape hatch for when a
// stale service worker won't let go of old code.
async function forceUpdate() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {}
  location.reload();
}

// --- One-time discoverability hints for the hidden gestures ---
function dismissHints() {
  localStorage.setItem("hints_seen_v1", "1");
  document.getElementById("hintToast").style.display = "none";
}
function maybeShowHints() {
  if (localStorage.getItem("hints_seen_v1")) return;
  document.getElementById("hintToast").style.display = "flex";
}

// --- localStorage cache (instant load + offline fallback) ---
const CACHE_KEY = "dayplanner_weather_cache";

function loadCachedWeather() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveCachedWeather(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch (e) {}
}

let isLoading = false;
async function loadAll() {
  if (isLoading) return;
  isLoading = true;
  try {
    await loadAllInner();
  } finally {
    isLoading = false;
  }
}

async function loadAllInner() {
  document.getElementById("dateLine").textContent = new Date().toLocaleDateString(I18N.dateLocale(), {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Bavarian holidays (cached ~30 days); cover this year + next for late Dec.
  const yr = new Date().getFullYear();
  const [hy, hy2] = await Promise.all([loadHolidays(yr), loadHolidays(yr + 1)]);
  holidayMap = { ...hy, ...hy2 };
  refreshDayOff();

  // Show cached weather instantly while fresh data loads
  const cached = loadCachedWeather();
  if (cached) {
    weatherData = cached.data;
    renderWeather(weatherData, selectedDay);
    renderOutfit(weatherData, selectedDay);
  } else {
    document.getElementById("outfit").innerHTML = SKELETON.outfit;
    document.getElementById("weather").innerHTML = SKELETON.weather;
  }

  try {
    weatherData = await fetchWeather();
    saveCachedWeather(weatherData);
    renderWeather(weatherData, selectedDay);
    renderOutfit(weatherData, selectedDay);
  } catch (e) {
    if (!cached) {
      document.getElementById("weather").innerHTML =
        `<div class="loading">${t("tr.forecastErr")}<button class="retry-btn" onclick="loadAll()">${t("dp.retry")}</button></div>`;
      document.getElementById("outfit").innerHTML = `<div class="loading">—</div>`;
    }
  }

  await loadRoutes(selectedDay);
}

I18N.apply(); // fill [data-i18n*] static markup + set <html dir/lang>
document.getElementById("outfitTitle").textContent = t("dp.outfitFor", { day: dayLabel(selectedDay) });
document.getElementById("leaveByTitle").textContent = t("dp.timeToGo");
setToggle("btnDirHome", selectedDirection === "home");
setToggle("btnDirOffice", selectedDirection === "office");
updateDayStepper(selectedDay);
// Re-arm a saved reminder, or drop it if its leave time has already passed.
if (reminder) {
  if (reminder.leaveTs <= Date.now()) clearReminder();
  else scheduleReminder(reminder);
}
document.getElementById("routesTitle").textContent = routesTitleFor(selectedDirection, selectedDay);

loadAll();
maybeShowHints();

// Auto-refresh every 5 minutes
setInterval(loadAll, CONFIG.refreshMs);

// Slim "leave by" bar: reveal it when the full Time-to-Go card scrolls away.
if ("IntersectionObserver" in window) {
  const card = document.getElementById("leaveByCard");
  if (card) {
    new IntersectionObserver((entries) => {
      leaveCardVisible = entries[0].isIntersecting;
      updateLeaveBar();
    }, { threshold: 0 }).observe(card);
  }
}

// --- Touch gestures: pull-to-refresh + swipe to switch direction ---
(function () {
  const PULL_THRESHOLD = 70;
  const SWIPE_THRESHOLD = 60;
  const ind = document.getElementById("pullIndicator");
  let startY = null, startX = 0, armed = false;

  window.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = window.scrollY === 0 ? e.touches[0].clientY : null;
    armed = false;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (startY == null || isLoading) return;
    const dy = e.touches[0].clientY - startY;
    armed = dy > PULL_THRESHOLD;
    ind.style.display = armed ? "block" : "none";
  }, { passive: true });

  window.addEventListener("touchend", (e) => {
    ind.style.display = "none";
    if (armed) loadAll();
    armed = false;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = startY == null ? 0 : e.changedTouches[0].clientY - startY;
    // Horizontal swipe matches the toggle order (To Work left, Going Home right):
    // swipe left → Going Home, swipe right → To Work.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      lastSwipeAt = Date.now(); // suppress the route tap that may follow
      selectDirection(dx < 0 ? "home" : "office");
    }
    startY = null;
  });
})();

// --- PWA: register service worker + "new version" refresh toast ---
function showUpdateToast(reg) {
  const toast = document.getElementById("updateToast");
  toast.style.display = "flex";
  document.getElementById("updateBtn").onclick = () => {
    if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
  };
}

if ("serviceWorker" in navigator) {
  let reloading = false;
  // Only auto-reload when an EXISTING controller is replaced (a real update).
  // On a first-ever install the controller goes null→worker via clients.claim;
  // don't reload then.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // A waiting worker already exists (updated while the app was closed).
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          // Installed + an existing controller => this is an update, not first install.
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast(reg);
          }
        });
      });
    }).catch(() => {});
  });
}
