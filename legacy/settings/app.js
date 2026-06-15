// --- Settings: home/office addresses + usual times, saved to localStorage ---
// Mirrors the dayplanner defaults; the planner reads localStorage["planner_settings"].
const DEFAULTS = {
  home:   { label: "Riesenfeldstraße 10, München", lat: 48.1769745, lon: 11.5652835, countryCode: "DE" },
  office: { label: "Lenbachplatz 3, München",      lat: 48.1411534, lon: 11.5681888, countryCode: "DE" },
  officeArrival: { hour: 9, minute: 0 },
  homeReturn:    { hour: 18, minute: 0 },
};
const SETTINGS_KEY = "planner_settings";

// Working copy of what's picked; starts from saved settings (or defaults).
let picked = { home: null, office: null };

// --- theme ---
const MOON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  document.getElementById("themeToggle").innerHTML = t === "light" ? MOON : SUN;
}
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  localStorage.setItem("theme", next);
  applyTheme(next);
}
applyTheme(localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));

function setStatus(msg, cls) {
  const el = document.getElementById("status");
  el.textContent = msg || "";
  el.className = "status" + (cls ? " " + cls : "");
}

// --- Geocoding via Photon (komoot): address-level, free, CORS-friendly. ---
async function geocodeAddress(q) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`;
  const d = await fetch(url).then((r) => r.json());
  return (d.features || []).map((f) => {
    const p = f.properties || {}, c = f.geometry.coordinates;
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const label = [p.name, street, p.postcode, p.city, p.country].filter(Boolean).join(", ");
    return { lat: c[1], lon: c[0], label, countryCode: (p.countrycode || "").toUpperCase() };
  });
}
async function reverseGeocode(lat, lon) {
  const url = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}&lang=en`;
  const d = await fetch(url).then((r) => r.json());
  const f = (d.features || [])[0];
  if (!f) return { lat, lon, label: `${lat.toFixed(5)}, ${lon.toFixed(5)}` };
  const p = f.properties || {};
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const label = [p.name, street, p.postcode, p.city, p.country].filter(Boolean).join(", ") ||
    `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return { lat, lon, label, countryCode: (p.countrycode || "").toUpperCase() };
}

const t = (k, p) => I18N.t(k, p);

function renderPicked(which) {
  const el = document.getElementById(which + "Picked");
  const p = picked[which];
  if (p) { el.className = "picked"; el.textContent = `📍 ${p.label}`; }
  else { el.className = "picked empty"; el.textContent = t("set.noPick"); }
}

function renderMatches(which, results) {
  const box = document.getElementById(which + "Matches");
  box.innerHTML = "";
  results.forEach((r) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = r.label;
    btn.onclick = () => {
      picked[which] = r;
      renderPicked(which);
      box.innerHTML = "";
      document.getElementById(which + "Search").value = "";
    };
    box.appendChild(btn);
  });
}

// Debounced search-as-you-type for each address field.
function wireSearch(which) {
  const input = document.getElementById(which + "Search");
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { document.getElementById(which + "Matches").innerHTML = ""; return; }
    timer = setTimeout(async () => {
      try {
        const results = await geocodeAddress(q);
        if (!results.length) { setStatus(t("set.noMatch", { q }), "bad"); return; }
        setStatus("");
        renderMatches(which, results);
      } catch (e) { setStatus(t("set.geoErr"), "bad"); }
    }, 400);
  });
}

function wireGps(which) {
  document.getElementById(which + "Gps").onclick = () => {
    if (!navigator.geolocation) { setStatus(t("set.noGeo"), "bad"); return; }
    setStatus(t("set.locating"));
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        picked[which] = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        renderPicked(which);
        setStatus(t("set.locSet"), "ok");
      } catch (e) { setStatus(t("set.locErr"), "bad"); }
    }, () => setStatus(t("set.locDenied"), "bad"), { enableHighAccuracy: true, timeout: 10000 });
  };
}

// --- Validate: ask MVG for a route between the two picks. ---
async function testRoute() {
  if (!picked.home || !picked.office) { setStatus(t("set.pickBothTest"), "bad"); return; }
  const res = document.getElementById("testResult");
  res.textContent = t("set.testing");
  // Cheap sanity guards before hitting the network.
  const km = haversineKm(picked.home, picked.office);
  if (km < 0.1) { res.textContent = t("set.testSame"); return; }
  if (km > 200) { res.textContent = t("set.testFar", { km: Math.round(km) }); }
  try {
    const url = `https://www.mvg.de/api/bgw-pt/v3/routes?originLatitude=${picked.home.lat}&originLongitude=${picked.home.lon}` +
      `&destinationLatitude=${picked.office.lat}&destinationLongitude=${picked.office.lon}` +
      `&routingDateTime=${new Date().toISOString()}&routingDateTimeIsArrival=false` +
      `&transportTypes=SCHIFF,RUFTAXI,BAHN,REGIONAL_BUS,UBAHN,TRAM,SBAHN,BUS`;
    const routes = await fetch(url).then((r) => r.json());
    if (Array.isArray(routes) && routes.length) {
      res.textContent = t("set.testOk");
    } else {
      res.textContent = t("set.testNone");
    }
  } catch (e) {
    res.textContent = t("set.testErr");
  }
}

function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function readTimes() {
  const a = document.getElementById("arrival").value.split(":");
  const r = document.getElementById("return").value.split(":");
  return {
    officeArrival: { hour: +a[0] || DEFAULTS.officeArrival.hour, minute: +a[1] || 0 },
    homeReturn:    { hour: +r[0] || DEFAULTS.homeReturn.hour,    minute: +r[1] || 0 },
  };
}

function save() {
  if (!picked.home || !picked.office) { setStatus(t("set.pickBoth"), "bad"); return; }
  const times = readTimes();
  const settings = { home: picked.home, office: picked.office, ...times };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  setStatus(t("set.savedOk"), "ok");
}

function resetToDefaults() {
  localStorage.removeItem(SETTINGS_KEY);
  load();
  setStatus(t("set.resetOk"), "ok");
  document.getElementById("testResult").textContent = "";
}

function hhmm(t) {
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

function load() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); } catch (e) { s = null; }
  s = s || DEFAULTS;
  picked.home = s.home || DEFAULTS.home;
  picked.office = s.office || DEFAULTS.office;
  document.getElementById("arrival").value = hhmm(s.officeArrival || DEFAULTS.officeArrival);
  document.getElementById("return").value = hhmm(s.homeReturn || DEFAULTS.homeReturn);
  renderPicked("home");
  renderPicked("office");
  document.getElementById("homeMatches").innerHTML = "";
  document.getElementById("officeMatches").innerHTML = "";
}

// --- Language: changing it re-renders all static text live + flips RTL. ---
function wireLang() {
  const sel = document.getElementById("langSelect");
  sel.value = I18N.getLang();
  sel.onchange = () => {
    I18N.setLang(sel.value);
    I18N.apply();              // re-fill [data-i18n*] + set <html dir/lang>
    renderPicked("home");      // dynamic strings not covered by data-i18n
    renderPicked("office");
    document.getElementById("testResult").textContent = "";
    setStatus("");
  };
}

["home", "office"].forEach((w) => { wireSearch(w); wireGps(w); });
document.getElementById("testBtn").onclick = testRoute;
document.getElementById("saveBtn").onclick = save;
document.getElementById("resetBtn").onclick = resetToDefaults;
wireLang();
I18N.apply();
load();
