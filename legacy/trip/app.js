// --- Trip Planner: destination + date range -> daily weather & outfit ---
// Outfit/weather logic mirrors the Office day planner (8am-9pm waking window).

const WAKING = { start: 8, end: 21 };

const t = (k, p) => I18N.t(k, p);

// [wx-key, icon-category]. Label text is looked up per language via t(key).
const WEATHER_CODES = {
  0: ["wx.clear", "sun"], 1: ["wx.mclear", "sun"], 2: ["wx.pcloudy", "cloud-sun"],
  3: ["wx.overcast", "cloud"], 45: ["wx.fog", "fog"], 48: ["wx.fog", "fog"],
  51: ["wx.drizzleL", "rain"], 53: ["wx.drizzle", "rain"], 55: ["wx.drizzleD", "rain"],
  56: ["wx.fdrizzle", "rain"], 57: ["wx.fdrizzle", "rain"],
  61: ["wx.rainL", "rain"], 63: ["wx.rain", "rain"], 65: ["wx.rainH", "rain"],
  66: ["wx.frain", "rain"], 67: ["wx.frain", "rain"],
  71: ["wx.snowL", "snow"], 73: ["wx.snow", "snow"], 75: ["wx.snowH", "snow"], 77: ["wx.grains", "snow"],
  80: ["wx.showers", "rain"], 81: ["wx.showers", "rain"], 82: ["wx.vshowers", "storm"],
  85: ["wx.sshowers", "snow"], 86: ["wx.sshowers", "snow"],
  95: ["wx.storm", "storm"], 96: ["wx.hail", "storm"], 99: ["wx.hail", "storm"],
};
function weatherInfo(code) { return WEATHER_CODES[code] || ["wx.unknown", "cloud"]; }

const WEATHER_ICONS = {
  sun: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f5a623" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  "cloud-sun": `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3" stroke="#f5a623"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 3.5l-1 1" stroke="#f5a623"/><path d="M9 18a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 4.5 18H9z" stroke="currentColor" fill="none" transform="translate(6,2)"/></svg>`,
  cloud: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 19h10z"/></svg>`,
  fog: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 14a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.4 1.8"/><path d="M3 14h13M3 18h18M3 10h6"/></svg>`,
  rain: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 13a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 13h10z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" stroke="#4da3ff"/></svg>`,
  snow: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 13a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 13h10z"/><path d="M8 17v3M8 18.5l-1.5 1M8 18.5l1.5 1M12 17v3M12 18.5l-1.5 1M12 18.5l1.5 1M16 17v3M16 18.5l-1.5 1M16 18.5l1.5 1" stroke="#9ad6ff"/></svg>`,
  storm: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 12a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 12h10z"/><path d="M13 11l-3 4h3l-2 4" stroke="#f5a623"/></svg>`,
};
function weatherIcon(category, size) {
  let svg = WEATHER_ICONS[category] || WEATHER_ICONS.cloud;
  if (size) svg = svg.replace(/width="40" height="40"/, `width="${size}" height="${size}"`);
  return svg;
}

const OUTFIT_ICONS = {
  // Short-sleeve tee: stubby sleeves, wide crew neck.
  shirt: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5 5.5 5 3.5 8.5l3 1.8L8 9v12h8V9l1.5 1.3 3-1.8L18.5 5 15 3.5a3 3 0 0 1-6 0Z"/></svg>`,
  // Long-sleeve pullover: full sleeves down the sides + ribbed cuffs and neck.
  sweater: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5 4 5.5 2.5 16l2.8.6.7-7V21h12v-11.4l.7 7 2.8-.6L22 5.5 17 3.5a3 3 0 0 1-6 0Z"/><path d="M4 15.5h2.7M17.3 15.5H20M9.3 4.2 12 6.6l2.7-2.4"/></svg>`,
  // Long overcoat: collar lapels, longer body, centre button placket.
  coat: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 5 5 4 11l2.2.6V21h11.6v-9.4L20 11l-1-6-3-2-3 3-3-3Z"/><path d="M12 6.5V21M11.4 11h.01M11.4 14h.01"/></svg>`,
  umbrella: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 8 0 0 1 9 8H3a9 8 0 0 1 9-8Z"/><path d="M12 11v7a2.5 2.5 0 0 0 5 0"/><path d="M12 3V2"/></svg>`,
  // Sunglasses — shown on clear/sunny days.
  glasses: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="7" height="6" rx="3"/><rect x="14" y="10" width="7" height="6" rx="3"/><path d="M10 12.5q2-1 4 0"/><path d="M3 11 1 8.5M21 11l2-2.5"/></svg>`,
};
function outfitIcon(key) { return key === "sun" ? weatherIcon("sun", 28) : (OUTFIT_ICONS[key] || ""); }

// Reduce an hourly field over waking hours (8am-9pm) of one day.
function daytimeReduce(data, dayIdx, field, fn, init) {
  const date = data.daily.time[dayIdx];
  let res = init, seen = false;
  for (let i = 0; i < data.hourly.time.length; i++) {
    const [d, t] = data.hourly.time[i].split("T");
    if (d !== date) continue;
    const h = parseInt(t.split(":")[0], 10);
    if (h < WAKING.start || h > WAKING.end) continue;
    const v = data.hourly[field][i];
    if (v == null) continue;
    res = fn(res, v); seen = true;
  }
  return seen ? res : null;
}

// Sunglasses needs at least this many clear waking hours.
const SUNNY_HOURS = 3;

// Count clear/sunny waking hours for the given day.
function sunnyHours(data, dayIdx) {
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

// Outfit decision — same thresholds as the Office planner.
function computeOutfit(minTemp, rainProb, wind) {
  // wearTextKey/jacketTextKey are i18n keys resolved at render time.
  let wearKey, wearTextKey, jacketKey, jacketTextKey, noteKeys = [];
  if (minTemp < 2) { wearKey = "sweater"; wearTextKey = "fit.thermalS"; jacketKey = "coat"; jacketTextKey = "fit.bigCoat"; noteKeys.push("fit.scarf"); }
  else if (minTemp < 9) { wearKey = "sweater"; wearTextKey = "fit.warmSweater"; jacketKey = "coat"; jacketTextKey = "fit.warmCoatS"; }
  else if (minTemp < 15) { wearKey = "shirt"; wearTextKey = "fit.longSleeveS"; jacketKey = "coat"; jacketTextKey = "fit.lightJacket"; }
  else if (minTemp < 21) { wearKey = "shirt"; wearTextKey = "fit.tshirtLightS"; jacketKey = "sun"; jacketTextKey = "fit.noCoatS"; }
  else { wearKey = "shirt"; wearTextKey = "fit.tshirt"; jacketKey = "sun"; jacketTextKey = "fit.noJacketS"; }
  if (wind >= 30) noteKeys.push("dp.windy");
  const umbrella = rainProb != null && rainProb >= 30;
  return { wearKey, wearTextKey, jacketKey, jacketTextKey, umbrella, noteKeys };
}

// --- theme ---
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themeToggle").innerHTML = theme === "light" ? MOON : SUN;
}
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  localStorage.setItem("theme", next);
  applyTheme(next);
}
const MOON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
applyTheme(localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
I18N.apply();

// --- helpers ---
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDayDate(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString(I18N.dateLocale(), { weekday: "short", day: "numeric", month: "short" });
}

// Default the date inputs to today..+5.
(function initDates() {
  const today = new Date();
  const end = new Date(); end.setDate(end.getDate() + 5);
  document.getElementById("start").value = ymd(today);
  document.getElementById("end").value = ymd(end);
  document.getElementById("start").min = ymd(today);
})();

// European country codes (incl. transcontinental with European territory).
const EUROPE_CC = new Set([
  "AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE",
  "GR","HU","IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL",
  "MK","NO","PL","PT","RO","RU","SM","RS","SK","SI","ES","SE","CH","UA","GB",
  "VA","TR","GI","FO","IM","JE","GG",
]);

async function geocode(name) {
  // Ask for more, then keep only European matches.
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en`;
  const d = await fetch(url).then((r) => r.json());
  return (d.results || [])
    .filter((r) => EUROPE_CC.has(r.country_code))
    .slice(0, 5)
    .map((r) => ({
      lat: r.latitude, lon: r.longitude,
      label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      short: r.name,
      cc: (r.country_code || "").toUpperCase(),
      country: r.country,
    }));
}

// Home country from Settings (default Germany) — to flag border crossings.
function homeCountry() {
  try {
    const s = JSON.parse(localStorage.getItem("planner_settings") || "null");
    return (s && s.home && s.home.countryCode ? s.home.countryCode : "DE").toUpperCase();
  } catch (e) { return "DE"; }
}

async function fetchTripWeather(lat, lon, start, end) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m` +
    `&timezone=auto&start_date=${start}&end_date=${end}`;
  return fetch(url).then((r) => r.json());
}

function status(msg) { document.getElementById("tripStatus").textContent = msg || ""; }

let chosenPlace = null;
async function planTrip(e) {
  e.preventDefault();
  const dest = document.getElementById("dest").value.trim();
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  document.getElementById("tripResults").innerHTML = "";
  document.getElementById("placeMatches").style.display = "none";

  if (!dest || !start || !end) return false;
  if (end < start) { status(t("tr.endBeforeStart")); return false; }

  status(t("tr.finding"));
  let places;
  try { places = await geocode(dest); }
  catch (err) {
    tripError(t("tr.geoErr"), () => document.getElementById("tripForm").requestSubmit());
    return false;
  }
  if (!places.length) { status(t("tr.noPlace", { q: dest })); return false; }

  // If several matches, let the user pick; default to the first.
  if (places.length > 1) renderPlaceChips(places, start, end);
  chosenPlace = places[0];
  await runPlan(chosenPlace, start, end);
  return false;
}

function renderPlaceChips(places, start, end) {
  const box = document.getElementById("placeMatches");
  box.style.display = "flex";
  box.innerHTML = places.map((p, i) =>
    `<button type="button" class="place-chip${i === 0 ? " active" : ""}" data-i="${i}">${p.label}</button>`
  ).join("");
  box.querySelectorAll(".place-chip").forEach((btn) => {
    btn.onclick = () => {
      box.querySelectorAll(".place-chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      chosenPlace = places[+btn.dataset.i];
      runPlan(chosenPlace, start, end);
    };
  });
}

// Shimmer placeholders while the forecast loads.
function showTripSkeleton() {
  document.getElementById("tripResults").innerHTML =
    `<div class="skeleton skel-overall"></div>` +
    `<div class="day-grid">` +
    `<div class="skeleton skel-day"></div>`.repeat(4) +
    `</div>`;
}

// Error state with a Retry button (matches the dayplanner pattern).
function tripError(msg, retryFn) {
  status("");
  const res = document.getElementById("tripResults");
  res.innerHTML = `<div class="trip-error">${msg}` +
    (retryFn ? `<button class="retry-btn" id="tripRetry">${t("dp.retry")}</button>` : "") + `</div>`;
  if (retryFn) document.getElementById("tripRetry").onclick = retryFn;
}

let currentStart = "", currentEnd = "";
async function runPlan(place, start, end) {
  status(t("tr.loadingFor", { place: place.short }));
  showTripSkeleton();
  let data;
  try { data = await fetchTripWeather(place.lat, place.lon, start, end); }
  catch (err) { tripError(t("tr.forecastErr"), () => runPlan(place, start, end)); return; }
  if (!data.daily || !data.daily.time || !data.daily.time.length) {
    tripError(t("tr.noForecast"));
    return;
  }
  currentStart = start; currentEnd = end;
  renderTrip(place, data);
  collapseSearch(place, data.daily.time);
  status("");
}

// Collapse the form into a compact bar so results get the space.
function collapseSearch(place, days) {
  document.getElementById("tripForm").style.display = "none";
  const intl = place.cc && place.cc !== homeCountry();
  const bar = document.getElementById("tripSummary");
  bar.innerHTML = `<span>🧳 ${place.short}</span>` +
    (intl ? `<span class="ts-passport" title="${t("tr.passportShort")}">🛂</span>` : "") +
    `<span class="ts-dates">${fmtDayDate(days[0])} – ${fmtDayDate(days[days.length - 1])}</span>` +
    `<span class="ts-change">${t("tr.change")}</span>`;
  bar.style.display = "flex";
}

function editSearch() {
  document.getElementById("tripForm").style.display = "flex";
  document.getElementById("tripSummary").style.display = "none";
}

// Outfit tiles, conditional: umbrella only when rain's likely, sunglasses on
// clear days. Wear + Outerwear always shown. Grid sizes to the tile count.
function outfitTiles(o, sunny) {
  const tiles = [
    `<div class="day-tile"><div class="t-ic">${outfitIcon(o.wearKey)}</div><div class="t-label">${t("tr.wear")}</div><div class="t-text">${t(o.wearTextKey)}</div></div>`,
    `<div class="day-tile"><div class="t-ic">${outfitIcon(o.jacketKey)}</div><div class="t-label">${t("tr.outerwear")}</div><div class="t-text">${t(o.jacketTextKey)}</div></div>`,
  ];
  if (o.umbrella) tiles.push(`<div class="day-tile"><div class="t-ic">${outfitIcon("umbrella")}</div><div class="t-label">${t("tr.umbrella")}</div><div class="t-text">${t("tr.yes")}</div></div>`);
  if (sunny) tiles.push(`<div class="day-tile"><div class="t-ic">${outfitIcon("glasses")}</div><div class="t-label">${t("tr.sunglasses")}</div><div class="t-text">${t("tr.yes")}</div></div>`);
  return `<div class="day-outfit" style="grid-template-columns:repeat(${tiles.length},1fr)">${tiles.join("")}</div>`;
}

// Trip-wide aggregate: coldest day drives wear/coat, any rainy day → umbrella,
// any clear day → sunglasses.
function tripOverall(data) {
  const days = data.daily.time;
  let minT = Infinity, maxT = -Infinity, maxRain = 0, maxWind = 0, valid = 0, anySunny = false;
  for (let i = 0; i < days.length; i++) {
    if (data.daily.temperature_2m_max[i] == null) continue;
    valid++;
    if (sunnyHours(data, i) >= SUNNY_HOURS) anySunny = true;
    const dMin = daytimeReduce(data, i, "apparent_temperature", Math.min, Infinity);
    const dRain = daytimeReduce(data, i, "precipitation_probability", Math.max, 0);
    const dWind = daytimeReduce(data, i, "windspeed_10m", Math.max, 0);
    minT = Math.min(minT, dMin == null ? data.daily.temperature_2m_min[i] : dMin);
    maxT = Math.max(maxT, data.daily.temperature_2m_max[i]);
    maxRain = Math.max(maxRain, dRain == null ? (data.daily.precipitation_probability_max[i] || 0) : dRain);
    maxWind = Math.max(maxWind, dWind == null ? data.daily.windspeed_10m_max[i] : dWind);
  }
  if (!valid) return null;
  return { minT, maxT, maxRain, maxWind, sunny: anySunny, outfit: computeOutfit(minT, maxRain, maxWind) };
}

function overallCard(place, days, ov) {
  const o = ov.outfit;
  // Crossing a border (destination country differs from home) → passport/ID.
  const intl = place.cc && place.cc !== homeCountry();
  return `
    <div class="overall-card">
      <div class="overall-head">${t("tr.packFor", { place: place.short, from: fmtDayDate(days[0]), to: fmtDayDate(days[days.length - 1]) })}</div>
      <div class="overall-range">${t("tr.upTo", { min: Math.round(ov.minT), max: Math.round(ov.maxT), rain: Math.round(ov.maxRain) })}</div>
      ${outfitTiles(o, ov.sunny)}
      ${intl ? `<div class="overall-passport">${t("tr.passport", { country: place.country || "" })}</div>` : ""}
      <div class="overall-note">${t("tr.covers")}${o.noteKeys.length ? " · " + o.noteKeys.map((k) => t(k)).join(" · ") : ""}</div>
    </div>`;
}

function renderTrip(place, data) {
  const days = data.daily.time;
  const cards = days.map((date, i) => {
    const code = data.daily.weathercode[i];
    if (code == null || data.daily.temperature_2m_max[i] == null) {
      return `<div class="day-card nodata"><div class="day-date">${fmtDayDate(date)}</div><div>${t("tr.noData")}</div></div>`;
    }
    const [labelKey, cat] = weatherInfo(code);
    const label = t(labelKey);
    const max = Math.round(data.daily.temperature_2m_max[i]);
    const min = Math.round(data.daily.temperature_2m_min[i]);
    const dayRain = data.daily.precipitation_probability_max[i];
    const dayWind = Math.round(data.daily.windspeed_10m_max[i]);

    const wMin = daytimeReduce(data, i, "apparent_temperature", Math.min, Infinity);
    const wRain = daytimeReduce(data, i, "precipitation_probability", Math.max, 0);
    const wWind = daytimeReduce(data, i, "windspeed_10m", Math.max, 0);
    const o = computeOutfit(wMin == null ? min : wMin, wRain == null ? dayRain : wRain, wWind == null ? dayWind : wWind);

    return `
      <div class="day-card">
        <div class="day-top">
          <div class="day-icon">${weatherIcon(cat, 34)}</div>
          <div>
            <div class="day-date">${fmtDayDate(date)}</div>
            <div class="day-cond">${label}</div>
          </div>
          <div class="day-temp">${min}° / ${max}°</div>
        </div>
        <div class="day-meta">🌧️ ${dayRain == null ? "–" : dayRain + "%"} · 💨 ${dayWind} km/h</div>
        ${outfitTiles(o, sunnyHours(data, i) >= SUNNY_HOURS)}
        ${o.noteKeys.length ? `<div class="day-note">${o.noteKeys.map((k) => t(k)).join(" · ")}</div>` : ""}
      </div>`;
  }).join("");

  const ov = tripOverall(data);
  const overall = ov ? overallCard(place, days, ov) : "";
  document.getElementById("tripResults").innerHTML = overall + `<div class="day-grid">${cards}</div>`;
}
