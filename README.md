# Assistant (NavTools)

A personal hub of handy web apps — built to make Munich days smoother. Rewritten in **Next.js** from the original [NavTools](https://github.com/NotARealApp/NavTools) vanilla PWA.

## What's inside

### Office — commute day planner (`/dayplanner`)
When to leave, what to wear, and transit routes with live MVG delays.

### Trip Outfit (`/trip`)
Pick a European city and date range — get daily weather and packing suggestions.

### Gym (`/gym`)
Under development placeholder.

### Settings (`/settings`)
Configure home/office addresses, commute times, and language.

## Tech

- **Next.js 16** (App Router) + TypeScript + React + **Tailwind CSS v4**
- **No backend** — client-side fetch to Open-Meteo, MVG, Nager.Date, Photon
- **PWA-ready** — manifest and icons in `/public`
- **i18n** — English, German, Malayalam, Persian (RTL)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
npm start
```

## Project structure

```
src/
├── app/                    # Routes (thin page wrappers)
├── components/
│   ├── ui/                 # Reusable primitives (Button, Card, Input, …)
│   ├── layout/             # AppShell, AppHeader
│   ├── icons/              # SVG icons + OutfitTiles
│   ├── dayplanner/         # Commute planner UI (small components)
│   ├── trip/               # Trip outfit UI
│   └── settings/           # Settings UI
├── hooks/                  # useDayPlanner (data + state)
├── lib/                    # Pure logic (weather, routes, i18n, cn)
└── context/                # Theme + i18n providers
```

Set home/office in **Settings**, or edit defaults in `src/lib/planner-settings.ts`.
