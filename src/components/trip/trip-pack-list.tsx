"use client";

import { useState } from "react";
import { SlideToggle } from "@/components/dayplanner/slide-toggle";
import { packList, washDays, dryDays, type LaundryMode, type TripOverall } from "@/lib/trip/logic";

const LAUNDRY_KEY = "trip_laundry";

function initMode(): LaundryMode {
  if (typeof window === "undefined") return "once";
  const v = localStorage.getItem(LAUNDRY_KEY);
  if (v === "off" || v === "once" || v === "light") return v;
  return v === "on" ? "once" : "once"; // legacy "on" → once; default on
}

function totalPieces(items: { qty: number }[]) {
  return items.reduce((s, i) => s + i.qty, 0);
}

export function TripPackList({
  overall,
  dates,
  fmtDayDate,
  t,
}: {
  overall: TripOverall;
  dates: string[];
  fmtDayDate: (iso: string) => string;
  t: (key: string, p?: Record<string, string | number>) => string;
}) {
  const [mode, setMode] = useState<LaundryMode>(initMode);
  const days = dates.length;

  const setLaundry = (m: LaundryMode) => {
    setMode(m);
    try { localStorage.setItem(LAUNDRY_KEY, m); } catch { /* ignore */ }
  };

  const items = packList(days, overall, mode);
  const washable = days > dryDays(overall); // wash can actually finish in time

  // Keep the wash-day list short — many washes on a long trip would wrap to a
  // wall of dates, so show the first two and a "+N" tail.
  const fmtDays = (list: string[]) => {
    const d = list.map(fmtDayDate);
    return d.length <= 2 ? d.join(" · ") : `${d.slice(0, 2).join(" · ")} +${d.length - 2}`;
  };

  // Travel-light promotion: how many fewer pieces vs the current "once" plan.
  const lightSaving =
    mode === "once" ? totalPieces(items) - totalPieces(packList(days, overall, "light")) : 0;
  const washList = fmtDays(washDays(dates, overall, mode));

  return (
    <div className="mb-3.5 rounded-[28px] border border-outline bg-surface-container p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-base font-semibold">{t("pack.title")}</div>
        {washable && (
          <SlideToggle
            value={mode === "off" ? "off" : "on"}
            options={[
              { value: "on", label: t("pack.laundryOn") },
              { value: "off", label: t("pack.laundryOff") },
            ]}
            onChange={(v) => setLaundry(v === "on" ? "once" : "off")}
            ariaLabel={t("pack.title")}
          />
        )}
      </div>

      {/* Travel-light hint: tappable. From "once" it promotes (and shows what it
          saves); when active it shows the wash days and taps back to "once". */}
      {mode === "once" && lightSaving > 0 && (
        <button
          type="button"
          onClick={() => setLaundry("light")}
          className="mb-3.5 flex w-full items-center gap-2 rounded-2xl bg-tertiary-container px-3.5 py-2.5 text-left text-xs font-medium text-on-tertiary-container transition duration-200 ease-[var(--ease-spring)] hover:brightness-95 active:scale-[0.99]"
        >
          <span aria-hidden className="text-sm">🧺</span>
          <span className="flex-1">
            {t("pack.travelLightHint", { days: fmtDays(washDays(dates, overall, "light")), n: lightSaving })}
          </span>
        </button>
      )}
      {mode === "light" && (
        <button
          type="button"
          onClick={() => setLaundry("once")}
          className="mb-3.5 flex w-full items-center gap-2 rounded-2xl bg-primary-container px-3.5 py-2.5 text-left text-xs font-medium text-on-primary-container transition duration-200 ease-[var(--ease-spring)] hover:brightness-95 active:scale-[0.99]"
        >
          <span aria-hidden className="text-sm">🧺</span>
          <span className="flex-1">{t("pack.travelLightOn", { days: washList })}</span>
        </button>
      )}

      {/* Qty-hero tiles — mirrors the OutfitTiles look so the card reads as one
          family: the number is the thing you scan, the item label sits under it. */}
      <ul className="grid grid-cols-3 gap-2">
        {items.map((i) => (
          <li key={i.key} className="rounded-2xl bg-surface-high px-2 py-3 text-center">
            <div className="text-2xl font-extrabold leading-none tabular-nums text-primary">{i.qty}</div>
            <div className="mt-1.5 text-[0.7rem] font-medium leading-tight text-on-surface-variant">{t(i.key)}</div>
          </li>
        ))}
      </ul>

      <p className="mt-3.5 text-xs leading-snug text-on-surface-variant">{t("pack.note")}</p>
    </div>
  );
}
