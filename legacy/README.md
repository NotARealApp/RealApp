# 🌤️ Assistant

A little personal hub of handy web apps — built to make my Munich days smoother.
No build step, no backend: just static HTML/CSS/JS you can open in a browser or
install as a phone app.

**Live:** https://navinnair.github.io/assistant/

---

## What's inside

### 🌤️ Office — commute day planner
Answers the two questions I ask every morning and evening: *when do I leave* and
*what do I wear?*

- **Time to Go** — a live countdown for the next catchable train, factoring the
  real walk to the station and real-time MVG delays. It even skips trains you'd
  have to sprint for (a configurable prep buffer).
- **Outfit** — Wear / Outerwear / Umbrella, decided from the day's **8am–9pm**
  weather (overnight cold doesn't count).
- **Routes** — both directions (To Work / Going Home) as a transit-map journey
  with line colours, live delays, crowding, and disruptions. Tap a route to open
  it in Google Maps.
- **Hourly forecast**, light/dark theme, offline cache, weekend & Bavarian
  **public-holiday** awareness ("no commute today" 😎), and a tomorrow-planning
  view for the night before.

### 🧳 Trip Outfit
Pick a European city and a date range — get the daily weather and **what to pack**:
a per-day Wear / Outerwear / Umbrella suggestion plus an overall "pack for the
coldest/wettest day" summary. Same outfit logic as the Office planner.

### 🏋️ Gym
Under development. (The dev showed up dressed for the weather. 🥶)

---

## Tech

- **Vanilla** HTML / CSS / JS — no framework, no bundler.
- **PWA** — installable, works offline, auto-updates.
- **APIs** (all free, no keys):
  - [Open-Meteo](https://open-meteo.com/) — weather forecast + geocoding
  - [MVG](https://www.mvg.de/) — Munich public-transport routes & departures
  - [Nager.Date](https://date.nager.at/) — public holidays

---

## Run it locally

```bash
# from the repo root
python3 -m http.server 8123
# then open http://localhost:8123/
```

> Tip: the service worker caches aggressively. If a change doesn't show, use the
> **Force update** button in the Office planner footer, or an incognito window.

## Tests

The Office planner's pure logic (route maths, outfit rules, formatters) has a
small Node test suite — no browser needed:

```bash
cd dayplanner
npm test
```

## Make it yours

The Office planner is configured in one place — `dayplanner/app.js`, the
`CONFIG` object at the top. Change the home/office coordinates, usual times,
walk/prep buffers, and refresh cadence to fit your own commute.

---

Built for fun and daily use. PRs and ideas welcome. 🙂

> 🤖 Vibe-coded with [Claude](https://claude.ai) — I supplied the vibes and the
> commute, Claude supplied the semicolons. No commits were harmed; several were
> force-pushed in the making of this app.
