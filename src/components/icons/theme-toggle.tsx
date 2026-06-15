"use client";

import { IconButton } from "@/components/ui/icon-button";
import { MoonIcon, SunIcon } from "@/components/icons/nav-icons";

export function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <IconButton onClick={onToggle} aria-label="Toggle theme">
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  );
}
