"use client";

import { useCallback, useEffect, useState } from "react";
import { IconLink } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { AppHeader, PageSubtitle } from "@/components/layout/app-header";
import { HomeGridIcon } from "@/components/icons/nav-icons";
import { ThemeToggle } from "@/components/icons/theme-toggle";
import { AddressField, StatusMessage, TimeFields } from "@/components/settings/address-field";
import { useI18n } from "@/context/I18nProvider";
import { useTheme } from "@/context/ThemeProvider";
import type { Lang } from "@/lib/i18n";
import {
  loadPlannerSettings,
  resetPlannerSettings,
  savePlannerSettings,
  type Place,
  type PlannerSettings,
} from "@/lib/planner-settings";
import { geocodeAddress, haversineKm, hhmm, reverseGeocode } from "@/lib/settings/geocoding";

export default function SettingsApp() {
  const { t, lang, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [picked, setPicked] = useState<{ home: Place | null; office: Place | null }>({
    home: null,
    office: null,
  });
  const [homeQuery, setHomeQuery] = useState("");
  const [officeQuery, setOfficeQuery] = useState("");
  const [homeMatches, setHomeMatches] = useState<Place[]>([]);
  const [officeMatches, setOfficeMatches] = useState<Place[]>([]);
  const [arrival, setArrival] = useState("09:00");
  const [returnTime, setReturnTime] = useState("18:00");
  const [status, setStatus] = useState("");
  const [statusVariant, setStatusVariant] = useState<"" | "ok" | "bad">("");
  const [testResult, setTestResult] = useState("");

  const load = useCallback(() => {
    const s = loadPlannerSettings();
    setPicked({ home: s.home, office: s.office });
    setArrival(hhmm(s.officeArrival));
    setReturnTime(hhmm(s.homeReturn));
    setHomeMatches([]);
    setOfficeMatches([]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const debouncedSearch = useCallback(
    (which: "home" | "office", q: string) => {
      if (q.length < 3) {
        if (which === "home") setHomeMatches([]);
        else setOfficeMatches([]);
        return;
      }
      const timer = setTimeout(async () => {
        try {
          const results = await geocodeAddress(q);
          if (!results.length) {
            setStatus(t("set.noMatch", { q }));
            setStatusVariant("bad");
            return;
          }
          setStatus("");
          setStatusVariant("");
          if (which === "home") setHomeMatches(results);
          else setOfficeMatches(results);
        } catch {
          setStatus(t("set.geoErr"));
          setStatusVariant("bad");
        }
      }, 400);
      return () => clearTimeout(timer);
    },
    [t],
  );

  useEffect(() => debouncedSearch("home", homeQuery), [homeQuery, debouncedSearch]);
  useEffect(() => debouncedSearch("office", officeQuery), [officeQuery, debouncedSearch]);

  function readTimes() {
    const a = arrival.split(":");
    const r = returnTime.split(":");
    return {
      officeArrival: { hour: +a[0] || 9, minute: +a[1] || 0 },
      homeReturn: { hour: +r[0] || 18, minute: +r[1] || 0 },
    };
  }

  function save() {
    if (!picked.home || !picked.office) {
      setStatus(t("set.pickBoth"));
      setStatusVariant("bad");
      return;
    }
    const settings: PlannerSettings = { home: picked.home, office: picked.office, ...readTimes() };
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

  function useGps(which: "home" | "office") {
    if (!navigator.geolocation) {
      setStatus(t("set.noGeo"));
      setStatusVariant("bad");
      return;
    }
    setStatus(t("set.locating"));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setPicked((p) => ({ ...p, [which]: place }));
          setStatus(t("set.locSet"));
          setStatusVariant("ok");
        } catch {
          setStatus(t("set.locErr"));
          setStatusVariant("bad");
        }
      },
      () => {
        setStatus(t("set.locDenied"));
        setStatusVariant("bad");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function selectPlace(which: "home" | "office", place: Place) {
    setPicked((p) => ({ ...p, [which]: place }));
    if (which === "home") {
      setHomeMatches([]);
      setHomeQuery("");
    } else {
      setOfficeMatches([]);
      setOfficeQuery("");
    }
  }

  return (
    <>
      <AppHeader
        title={t("set.title")}
        actions={
          <>
            <IconLink href="/" aria-label={t("a11y.home")}>
              <HomeGridIcon />
            </IconLink>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </>
        }
      />
      <PageSubtitle>{t("set.subtitle")}</PageSubtitle>

      <Card>
        <CardTitle>{t("set.language")}</CardTitle>
        <Select value={lang} onChange={(e) => setLanguage(e.target.value as Lang)}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="ml">മലയാളം</option>
          <option value="fa">فارسی</option>
        </Select>
      </Card>

      <AddressField
        title={t("set.home")}
        query={homeQuery}
        placeholder={t("set.searchHome")}
        gpsLabel={t("set.gps")}
        noPickLabel={t("set.noPick")}
        picked={picked.home}
        matches={homeMatches}
        onQueryChange={setHomeQuery}
        onGps={() => useGps("home")}
        onSelect={(p) => selectPlace("home", p)}
      />

      <AddressField
        title={t("set.office")}
        query={officeQuery}
        placeholder={t("set.searchOffice")}
        gpsLabel={t("set.gps")}
        noPickLabel={t("set.noPick")}
        picked={picked.office}
        matches={officeMatches}
        onQueryChange={setOfficeQuery}
        onGps={() => useGps("office")}
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
