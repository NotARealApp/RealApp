# Plan a time — spec

Let the user override the day planner's live "now" routing with a **Leave by** or
**Arrive by** time for the selected day, then list the matching routes.

## UI

- A collapsible row (`PlanTimePicker`) sits under the Today/Tomorrow stepper on
  the day planner.
- **Collapsed (default)** = live "Now" behaviour. The row shows either
  `🕒 Plan a time` (no plan) or the active plan, e.g. `🕒 Arrive by 09:00`.
- **Expanded** shows:
  - a segmented **Leave by / Arrive by** toggle,
  - a time field (`<input type="time">`),
  - a **Show routes** button (primary),
  - a **Now** link (top-right) to clear back to live.

## Behaviour

1. Edits are a **local draft** — changing the mode or time does **not** refetch.
   Only **Show routes** commits the plan (one refetch).
2. **Show routes** is disabled until the draft differs from the applied plan
   (no redundant fetches).
3. On **Show routes** the picker **collapses** to free space; the collapsed row
   reflects the applied plan.
4. **Now** clears the plan (`{mode:"now", time:""}`) and collapses → live routing.
5. **Leave by HH:MM** → query departures from that time (`isArrival=false`).
   **Arrive by HH:MM** → query arrivals by that time (`isArrival=true`), MVG's
   native arrival routing.
6. The plan applies to the **selected day** (today or tomorrow) and re-resolves
   when the day changes.
7. While a plan is active the **Time-to-Go card** renders as a static plan card
   (header `Arrive by 09:00 — To work`, no live countdown), and the **routes
   list shows every planned route** — no hiding of departures before "now" and
   no live relative countdown (those are live-only).

## Persistence

- The active plan is saved to `localStorage["plan_time"]` and restored on load,
  so closing and reopening keeps it. Reopening the editor seeds the draft from it.
- The route cache (`localStorage["planner_routes_cache_v2"]`) is tagged with a
  `planKey` (`now:`, `leave:07:30`, `arrive:09:00`, …). A cached result is reused
  only for the same day **and** the same plan, so a plan's routes never bleed
  into the live view or a different time.

## Edge cases

- Midnight `00:00` is preserved (NaN-only parse, not `|| default`).
- Arrive-by skips the forward "next departures" padding (wrong direction) and
  uses MVG's returned set.
- Duplicate routes from MVG are de-duped by id (`dedupeById`) so React keys stay
  unique.

## Non-goals (this feature)

- No recurring/daily reminders or staged push notifications (that was the larger
  "commute schedule" idea, deferred).
- No arrive-by for the existing tomorrow preset (still treated as a departure).
