"use client";

import { IconLink } from "@/components/ui/icon-button";
import { AppHeader } from "@/components/layout/app-header";
import { HomeGridIcon, SettingsIcon } from "@/components/icons/nav-icons";
import { ThemeToggle } from "@/components/icons/theme-toggle";

type DayPlannerHeaderProps = {
  title: string;
  homeLabel: string;
  settingsLabel: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function DayPlannerHeader({
  title,
  homeLabel,
  settingsLabel,
  theme,
  onToggleTheme,
}: DayPlannerHeaderProps) {
  return (
    <AppHeader
      title={title}
      actions={
        <>
          <IconLink href="/apps" aria-label={homeLabel}>
            <HomeGridIcon />
          </IconLink>
          <IconLink href="/settings" aria-label={settingsLabel}>
            <SettingsIcon />
          </IconLink>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </>
      }
    />
  );
}
