"use client";

import { IconLink } from "@/components/ui/icon-button";
import { AppHeader, PageSubtitle } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { HomeGridIcon } from "@/components/icons/nav-icons";
import { ThemeToggle } from "@/components/icons/theme-toggle";
import { useI18n } from "@/context/I18nProvider";
import { useTheme } from "@/context/ThemeProvider";

export default function GymPage() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <AppHeader
        title={t("card.gym")}
        actions={
          <>
            <IconLink href="/" aria-label={t("a11y.home")}>
              <HomeGridIcon />
            </IconLink>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </>
        }
      />
      <div className="py-10 text-center">
        <span className="text-6xl">🏋️</span>
        <h2 className="mt-4 text-xl font-semibold">{t("gym.title")}</h2>
        <PageSubtitle>{t("gym.sub")}</PageSubtitle>
        <Badge>{t("badge.dev")}</Badge>
      </div>
    </>
  );
}
