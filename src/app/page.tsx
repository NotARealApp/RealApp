"use client";

import Link from "next/link";
import { AppHeader, PageSubtitle } from "@/components/layout/app-header";
import { IconLink } from "@/components/ui/icon-button";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon, SettingsIcon } from "@/components/icons/nav-icons";
import { ThemeToggle } from "@/components/icons/theme-toggle";
import { useI18n } from "@/context/I18nProvider";
import { useTheme } from "@/context/ThemeProvider";
import { cn } from "@/lib/cn";

const APPS = [
  { href: "/dayplanner", emoji: "🌤️", titleKey: "card.office", descKey: "card.office.desc" },
  { href: "/trip", emoji: "🧳", titleKey: "card.trip", descKey: "card.trip.desc" },
  { href: "/gym", emoji: "🏋️", titleKey: "card.gym", descKey: "card.gym.desc", badgeKey: "badge.dev" },
] as const;

export default function HomePage() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <AppHeader
        title="Assistant"
        actions={
          <>
            <IconLink href="/settings" aria-label={t("a11y.settings")} title={t("a11y.settings")}>
              <SettingsIcon />
            </IconLink>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </>
        }
      />
      <PageSubtitle>{t("home.subtitle")}</PageSubtitle>

      {APPS.map((app) => (
        <Link
          key={app.href}
          href={app.href}
          className={cn(
            "relative mb-3 flex items-center gap-4 overflow-hidden rounded-lg border border-outline",
            "bg-surface-container p-4 text-on-surface shadow-elev-1 transition",
            "hover:shadow-elev-2 active:scale-[0.99]",
          )}
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-container text-2xl text-on-primary-container">
            {app.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <h2 className="text-base font-medium">{t(app.titleKey)}</h2>
            <p className="text-sm text-on-surface-variant">{t(app.descKey)}</p>
            {"badgeKey" in app && app.badgeKey && <Badge>{t(app.badgeKey)}</Badge>}
          </span>
          <ChevronRightIcon className="shrink-0 text-on-surface-variant rtl:scale-x-[-1]" />
        </Link>
      ))}
    </>
  );
}
