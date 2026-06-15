// Tests for the pure route/weather logic in app.js. Run: node tests/run.js
const app = require("./harness.js");

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.error("  ✗ " + name); }
}
function eq(a, b, name) {
  ok(a === b, `${name} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

const MIN = 60000;
function iso(s) { return new Date(s).toISOString(); }

// --- fixtures ---
function walkPart(fromName, fromTime, toName, toTime) {
  return {
    line: { label: "", transportType: "PEDESTRIAN", destination: "" },
    from: { name: fromName, plannedDeparture: iso(fromTime), stationGlobalId: null },
    to: { name: toName, plannedDeparture: iso(toTime) },
    realTime: false, messages: [], infos: [],
  };
}
function transitPart(label, type, dest, fromName, fromTime, toName, toTime, extra = {}) {
  return {
    line: { label, transportType: type, destination: dest },
    from: { name: fromName, plannedDeparture: iso(fromTime), stationGlobalId: "gid:" + fromName },
    to: { name: toName, plannedDeparture: iso(toTime) },
    realTime: true, messages: [], infos: [], occupancy: extra.occupancy,
  };
}

// === summarizeRoute ===
(function () {
  // Consistent: 6-min walk then tram; leave-home == walk start.
  const r = { parts: [
    walkPart("Home", "2026-06-14T10:00:00", "StationA", "2026-06-14T10:06:00"),
    transitPart("27", "TRAM", "Center", "StationA", "2026-06-14T10:06:00", "StationB", "2026-06-14T10:20:00"),
    walkPart("StationB", "2026-06-14T10:20:00", "Office", "2026-06-14T10:25:00"),
  ]};
  const s = app.summarizeRoute(r);
  eq(s.walk.minutes, 6, "summarize: walk minutes");
  eq(s.walk.dest, "StationA", "summarize: walk dest");
  eq(s.legs.length, 1, "summarize: one transit leg");
  eq(s.legs[0].line, "27", "summarize: leg line");
  eq(new Date(s.departure).getTime(), new Date("2026-06-14T10:00:00").getTime(), "summarize: leave-home = board - walk");
  eq(new Date(s.arrival).getTime(), new Date("2026-06-14T10:25:00").getTime(), "summarize: arrival = final walk end");
})();

(function () {
  // Repair: walk start mis-anchored AFTER the train (MVG artifact). Leave-home
  // must still be derived as board - walk (10:06 - 6min = 10:00), not 10:09.
  const r = { parts: [
    walkPart("Home", "2026-06-14T10:09:00", "StationA", "2026-06-14T10:15:00"),
    transitPart("27", "TRAM", "Center", "StationA", "2026-06-14T10:06:00", "StationB", "2026-06-14T10:20:00"),
  ]};
  const s = app.summarizeRoute(r);
  eq(new Date(s.departure).getTime(), new Date("2026-06-14T10:00:00").getTime(), "summarize: repairs backward walk anchor");
})();

// === effective times / delays ===
(function () {
  const s = { departure: iso("2026-06-14T10:00:00"),
    legs: [{ boardTime: iso("2026-06-14T10:05:00"), delayMin: 7, cancelled: false }] };
  eq(app.routeDelayMs(s), 7 * MIN, "delay: routeDelayMs");
  eq(app.effDepartureMs(s), new Date("2026-06-14T10:07:00").getTime(), "delay: effDeparture shifted +7");
  eq(app.effBoardMs(s), new Date("2026-06-14T10:12:00").getTime(), "delay: effBoard shifted +7");
  eq(app.routeCancelled(s), false, "delay: not cancelled");
  eq(app.routeCancelled({ legs: [{ cancelled: true }] }), true, "delay: cancelled when any leg cancelled");
})();

// === pickChosen (3-min prep buffer) ===
(function () {
  const now = new Date("2026-06-14T10:00:00");
  const mk = (offsetMin, delayMin = 0, cancelled = false) => ({
    departure: iso(new Date(now.getTime() + offsetMin * MIN)),
    legs: [{ boardTime: iso(new Date(now.getTime() + offsetMin * MIN)), delayMin, cancelled }],
  });
  // +1 too tight (<3 buffer), +5 catchable, +10 later -> pick +5
  let s = [mk(1), mk(5), mk(10)];
  eq(app.pickChosen(s, now), s[1], "pick: skips sub-buffer, takes next catchable");
  // chosen +5 cancelled -> take +10
  s = [mk(1), mk(5, 0, true), mk(10)];
  eq(app.pickChosen(s, now), s[2], "pick: skips cancelled");
  // all too tight -> fallback to last
  s = [mk(0), mk(1), mk(2)];
  eq(app.pickChosen(s, now), s[2], "pick: fallback to last when all too tight");
  // delay makes a tight train catchable: +1 planned but +5 delay -> eff +6 > buffer
  s = [mk(1, 5), mk(8)];
  eq(app.pickChosen(s, now), s[0], "pick: delay can make a tight train catchable");
})();

// === leaveTier ===
(function () {
  eq(app.leaveTier(0), "urgent", "tier: 0 urgent");
  eq(app.leaveTier(4), "urgent", "tier: 4 urgent");
  eq(app.leaveTier(5), "soon", "tier: 5 soon");
  eq(app.leaveTier(8), "soon", "tier: 8 soon");
  eq(app.leaveTier(9), "ok", "tier: 9 ok");
})();

// === lineColor ===
(function () {
  eq(app.lineColor("U3", "UBAHN"), "#ED6720", "color: U3");
  eq(app.lineColor("27", "TRAM"), "#E2001A", "color: tram fallback");
  eq(app.lineColor("N40", "TRAM"), "#2b2d42", "color: night line");
  eq(app.lineColor("X30", "BUS"), "#6a1b9a", "color: express bus");
  eq(app.lineColor("55", "BUS"), "#004f6e", "color: metrobus 55");
  eq(app.lineColor("70", "BUS"), "#00586A", "color: regular bus fallback");
})();

// === occupancyTag ===
(function () {
  ok(app.occupancyTag("LOW").includes("Quiet"), "occ: LOW -> Quiet");
  ok(app.occupancyTag("MEDIUM").includes("Busy"), "occ: MEDIUM -> Busy");
  ok(app.occupancyTag("HIGH").includes("Packed"), "occ: HIGH -> Packed");
  eq(app.occupancyTag("UNKNOWN"), "", "occ: UNKNOWN -> empty");
  eq(app.occupancyTag(undefined), "", "occ: undefined -> empty");
})();

// === daytime weather reduce (8am–9pm window) ===
(function () {
  const data = {
    daily: { time: ["2026-06-14"] },
    hourly: {
      time: ["2026-06-14T06:00", "2026-06-14T08:00", "2026-06-14T12:00", "2026-06-14T21:00", "2026-06-14T23:00"],
      precipitation_probability: [90, 10, 60, 30, 95],
      temperature_2m: [2, 9, 15, 12, 1],
      windspeed_10m: [40, 5, 20, 8, 50],
    },
  };
  eq(app.daytimeRainChance(data, 0), 60, "weather: max rain within 8-21 ignores 06/23");
  eq(app.daytimeMinTemp(data, 0), 9, "weather: min temp within 8-21 ignores cold 23h");
  eq(app.daytimeMaxWind(data, 0), 20, "weather: max wind within 8-21 ignores 06/23");
})();

// === hourlyEntries ===
(function () {
  const hours = [];
  for (let h = 0; h < 24; h++) hours.push("2026-06-15T" + String(h).padStart(2, "0") + ":00");
  const data = {
    daily: { time: ["2026-06-14", "2026-06-15"] },
    hourly: {
      time: hours,
      temperature_2m: hours.map(() => 18),
      precipitation_probability: hours.map(() => 0),
      weathercode: hours.map(() => 0),
    },
  };
  // dayIdx=1 -> starts at waking.start (8), step 2, count 4 -> 8,10,12,14
  const e = app.hourlyEntries(data, 1, 4, 2);
  eq(e.length, 4, "hourly: count honored");
  eq(e[0].hour, 8, "hourly: starts at waking start");
  eq(e[3].hour, 14, "hourly: step of 2");
})();

// === fmtDuration / fmtTime ===
(function () {
  eq(app.fmtDuration(25 * MIN), "25 min", "fmt: duration minutes");
  ok(/^\d{1,2}:\d{2}$/.test(app.fmtTime(iso("2026-06-14T10:05:00"))), "fmt: time HH:MM shape");
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
