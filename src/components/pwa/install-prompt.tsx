"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/context/I18nProvider";
import { Button } from "@/components/ui/button";

// Chrome no longer auto-shows an install banner: beforeinstallprompt fires but
// the page must capture it and present its own UI, else install is buried in the
// browser menu. iOS Safari never fires the event — show a manual hint instead.
const DISMISS_KEY = "pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Android Chrome can fire beforeinstallprompt before React attaches its effect
// listener. An inline <head> script (see layout.tsx) catches it early and stashes
// it here; "bip-ready" is dispatched so a late-mounting component still gets it.
declare global {
  interface Window {
    __bip?: BeforeInstallPromptEvent | null;
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;
    setDismissed(false);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__bip = e as BeforeInstallPromptEvent;
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onBipReady = () => {
      if (window.__bip) setDeferred(window.__bip);
    };
    const onInstalled = () => {
      window.__bip = null;
      setDeferred(null);
      setIosHint(false);
      localStorage.setItem(DISMISS_KEY, "1");
    };
    // Event the early <head> script may have already caught before mount.
    if (window.__bip) setDeferred(window.__bip);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("bip-ready", onBipReady);
    window.addEventListener("appinstalled", onInstalled);

    // iOS gives no event — surface the manual Add-to-Home-Screen hint.
    if (isIos()) setIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("bip-ready", onBipReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    window.__bip = null;
    setDeferred(null);
    setIosHint(false);
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") localStorage.setItem(DISMISS_KEY, "1");
    window.__bip = null;
    setDeferred(null);
  };

  if (dismissed || (!deferred && !iosHint)) return null;

  // Sticky top bar (above the header, in document flow): stays visible but
  // overlaps nothing — the bottom is owned by transient toasts (hint/undo/leave).
  return (
    <div className="sticky top-0 z-50 border-b border-outline bg-surface-container shadow-elev-1 animate-[slide-down-in_240ms_var(--ease-out)]">
      <div
        role="dialog"
        aria-label={t("pwa.installTitle")}
        className="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-3 md:max-w-[640px] lg:max-w-[720px]"
      >
        <div className="flex-1">
          <p className="text-sm font-medium">{t("pwa.installTitle")}</p>
          <p className="mt-0.5 text-xs text-on-surface/70">
            {iosHint ? t("pwa.iosHint") : t("pwa.installBody")}
          </p>
        </div>
        {deferred && (
          <Button variant="soft" className="min-h-9 shrink-0 px-4 py-2 text-xs" onClick={install}>
            {t("pwa.install")}
          </Button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("pwa.later")}
          className="shrink-0 rounded-full px-2 py-1 text-xs text-on-surface/60 hover:text-on-surface"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
