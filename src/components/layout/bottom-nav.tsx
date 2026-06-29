"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/context/I18nProvider";
import { isRtl } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { loadPlannerSettings, SETTINGS_EVENT, type TabFlags } from "@/lib/planner-settings";
import {
  CalendarTodayIcon,
  SuitcaseIcon,
  MapPinIcon,
  SettingsIcon,
  DumbbellIcon,
} from "@/components/icons/nav-icons";

// Today / Trip / Settings are always present; Gym and Places are opt-in (toggled
// in Settings). `flag` names the TabFlags key that must be true to show the tab.
const ALL_TABS = [
  { href: "/dayplanner", labelKey: "nav.today", Icon: CalendarTodayIcon },
  { href: "/trip", labelKey: "nav.trip", Icon: SuitcaseIcon },
  { href: "/gym", labelKey: "nav.gym", Icon: DumbbellIcon, flag: "gym" },
  { href: "/places", labelKey: "nav.places", Icon: MapPinIcon, flag: "places" },
  { href: "/settings", labelKey: "nav.settings", Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const { t, lang } = useI18n();
  const rtl = isRtl(lang);
  const pathname = usePathname() || "";

  // Tab visibility lives in settings; re-read on mount and whenever settings
  // change (same tab via SETTINGS_EVENT, other tabs via the storage event).
  const [tabFlags, setTabFlags] = useState<TabFlags>({ places: false, gym: false });
  useEffect(() => {
    const sync = () => setTabFlags(loadPlannerSettings().tabs);
    sync();
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const tabs = ALL_TABS.filter((tab) => !("flag" in tab) || tabFlags[tab.flag]);
  const n = tabs.length;

  // Only show on a tab destination — onboarding and stray routes stay chrome-free.
  const active = tabs.findIndex((tab) => pathname.startsWith(tab.href));
  if (active === -1) return null;

  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="relative mx-auto grid max-w-[480px] px-2 py-1.5"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {/* Sliding pill behind the active tab — anchored to the inline-start edge
            and translated in the reading direction, so it tracks under RTL too. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 start-2 rounded-2xl bg-secondary-container transition-transform duration-300 ease-[var(--ease-spring)]"
          style={{ width: `calc((100% - 1rem) / ${n})`, transform: `translateX(${active * (rtl ? -100 : 100)}%)` }}
        />
        {tabs.map((tab, i) => {
          const on = i === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative z-10 flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.65rem] font-medium transition-colors",
                on ? "text-on-secondary-container" : "text-on-surface-variant",
              )}
            >
              <tab.Icon className="size-[22px]" />
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
