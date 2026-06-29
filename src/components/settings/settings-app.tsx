"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { AppHeader, PageSubtitle } from "@/components/layout/app-header";
import { GlobeIcon, HouseIcon, BuildingIcon, DumbbellIcon, MapPinIcon } from "@/components/icons/nav-icons";
import { ThemeToggle } from "@/components/icons/theme-toggle";
import { AddressField, StatusMessage, TimeFields } from "@/components/settings/address-field";
import { SlideToggle } from "@/components/dayplanner/slide-toggle";
import { useI18n } from "@/context/I18nProvider";
import { useTheme } from "@/context/ThemeProvider";
import { useAddressSearch } from "@/hooks/use-address-search";
import type { Lang } from "@/lib/i18n";
import {
  loadPlannerSettings,
  resetPlannerSettings,
  savePlannerSettings,
  saveTabs,
  type PlannerSettings,
  type TabFlags,
} from "@/lib/planner-settings";
import { haversineKm, hhmm } from "@/lib/settings/geocoding";

export default function SettingsApp() {
  const { t, lang, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const {
    picked,
    setPicked,
    homeQuery,
    setHomeQuery,
    officeQuery,
    setOfficeQuery,
    homeMatches,
    officeMatches,
    setHomeMatches,
    setOfficeMatches,
    status,
    statusVariant,
    setStatus,
    setStatusVariant,
    gps,
    selectPlace,
  } = useAddressSearch(t);
  const [arrival, setArrival] = useState("09:00");
  const [returnTime, setReturnTime] = useState("18:00");
  const [testResult, setTestResult] = useState("");
  const [tabs, setTabs] = useState<TabFlags>({ places: false, gym: false });

  const load = useCallback(() => {
    const s = loadPlannerSettings();
    setPicked({ home: s.home, office: s.office });
    setArrival(hhmm(s.officeArrival));
    setReturnTime(hhmm(s.homeReturn));
    setTabs(s.tabs);
    setHomeMatches([]);
    setOfficeMatches([]);
  }, [setPicked, setHomeMatches, setOfficeMatches]);

  // Tab toggles persist immediately (and fire SETTINGS_EVENT) so the bottom nav
  // updates without waiting for the main Save button.
  function toggleTab(key: keyof TabFlags, on: boolean) {
    const next = { ...tabs, [key]: on };
    setTabs(next);
    saveTabs(next);
  }

  useEffect(() => {
    load();
  }, [load]);

  function readTimes() {
    // Fall back only on a non-numeric value — `0` (midnight) is valid, so don't
    // use `||`, which would turn 00:00 into the default hour.
    const part = (s: string, i: number, def: number) => {
      const n = parseInt(s.split(":")[i], 10);
      return Number.isNaN(n) ? def : n;
    };
    return {
      officeArrival: { hour: part(arrival, 0, 9), minute: part(arrival, 1, 0) },
      homeReturn: { hour: part(returnTime, 0, 18), minute: part(returnTime, 1, 0) },
    };
  }

  function save() {
    if (!picked.home || !picked.office) {
      setStatus(t("set.pickBoth"));
      setStatusVariant("bad");
      return;
    }
    // Keep slices this form doesn't edit (destinations, gym, tab flags) — they
    // live in the same blob, so re-read them fresh and pass through.
    const fresh = loadPlannerSettings();
    const settings: PlannerSettings = {
      home: picked.home,
      office: picked.office,
      ...readTimes(),
      destinations: fresh.destinations,
      gym: fresh.gym,
      tabs: fresh.tabs,
    };
    savePlannerSettings(settings);
    setStatus(t("set.savedOk"));
    setStatusVariant("ok");
  }

  async function testRoute() {
    if (!picked.home || !picked.office) {
      setStatus(t("set.pickBothTest"));
      setStatusVariant("bad");
      return;
    }
    setTestResult(t("set.testing"));
    const km = haversineKm(picked.home, picked.office);
    if (km < 0.1) {
      setTestResult(t("set.testSame"));
      return;
    }
    if (km > 200) setTestResult(t("set.testFar", { km: Math.round(km) }));
    try {
      const url =
        `https://www.mvg.de/api/bgw-pt/v3/routes?originLatitude=${picked.home.lat}&originLongitude=${picked.home.lon}` +
        `&destinationLatitude=${picked.office.lat}&destinationLongitude=${picked.office.lon}` +
        `&routingDateTime=${new Date().toISOString()}&routingDateTimeIsArrival=false` +
        `&transportTypes=SCHIFF,RUFTAXI,BAHN,REGIONAL_BUS,UBAHN,TRAM,SBAHN,BUS`;
      const routes = await fetch(url).then((r) => r.json());
      setTestResult(Array.isArray(routes) && routes.length ? t("set.testOk") : t("set.testNone"));
    } catch {
      setTestResult(t("set.testErr"));
    }
  }

  return (
    <>
      <AppHeader
        title={t("set.title")}
        actions={<ThemeToggle theme={theme} onToggle={toggleTheme} />}
      />
      <PageSubtitle>{t("set.subtitle")}</PageSubtitle>

      <Card>
        <CardTitle className="flex items-center gap-2">
          <GlobeIcon className="size-4 text-primary" />
          {t("set.language")}
        </CardTitle>
        <Select value={lang} onChange={(e) => setLanguage(e.target.value as Lang)}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="ml">മലയാളം</option>
          <option value="fa">فارسی</option>
        </Select>
      </Card>

      <AddressField
        title={t("set.home")}
        icon={<HouseIcon className="size-4 text-primary" />}
        query={homeQuery}
        placeholder={t("set.searchHome")}
        gpsLabel={t("set.gps")}
        noPickLabel={t("set.noPick")}
        picked={picked.home}
        matches={homeMatches}
        onQueryChange={setHomeQuery}
        onGps={() => gps("home")}
        onSelect={(p) => selectPlace("home", p)}
      />

      <AddressField
        title={t("set.office")}
        icon={<BuildingIcon className="size-4 text-primary" />}
        query={officeQuery}
        placeholder={t("set.searchOffice")}
        gpsLabel={t("set.gps")}
        noPickLabel={t("set.noPick")}
        picked={picked.office}
        matches={officeMatches}
        onQueryChange={setOfficeQuery}
        onGps={() => gps("office")}
        onSelect={(p) => selectPlace("office", p)}
      />

      <TimeFields
        title={t("set.times")}
        arrivalLabel={t("set.arrival")}
        returnLabel={t("set.return")}
        arrival={arrival}
        returnTime={returnTime}
        onArrivalChange={setArrival}
        onReturnChange={setReturnTime}
      />

      <Card>
        <CardTitle>{t("set.tabs")}</CardTitle>
        <p className="mb-3 text-sm text-on-surface-variant">{t("set.tabsHint")}</p>
        <div className="space-y-3">
          {([
            { key: "gym" as const, label: t("nav.gym"), Icon: DumbbellIcon },
            { key: "places" as const, label: t("nav.places"), Icon: MapPinIcon },
          ]).map(({ key, label, Icon }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 text-primary" />
                {label}
              </span>
              <SlideToggle
                ariaLabel={label}
                value={tabs[key] ? "on" : "off"}
                onChange={(v) => toggleTab(key, v === "on")}
                options={[
                  { value: "on", label: t("set.on") },
                  { value: "off", label: t("set.off") },
                ]}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>{t("set.check")}</CardTitle>
        <Button variant="tonal" fullWidth onClick={testRoute}>
          {t("set.testBtn")}
        </Button>
        {testResult && <p className="mt-2.5 text-sm">{testResult}</p>}
      </Card>

      <StatusMessage message={status} variant={statusVariant} />

      <div className="mt-1 flex gap-2.5">
        <Button
          variant="ghost"
          fullWidth
          onClick={() => {
            resetPlannerSettings();
            load();
            setStatus(t("set.resetOk"));
            setStatusVariant("ok");
            setTestResult("");
          }}
        >
          {t("set.reset")}
        </Button>
        <Button fullWidth onClick={save}>
          {t("set.save")}
        </Button>
      </div>
    </>
  );
}
