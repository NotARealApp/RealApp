"use client";

import { useCallback, useEffect, useState } from "react";
import type { Place } from "@/lib/planner-settings";
import { geocodeAddress, reverseGeocode } from "@/lib/settings/geocoding";
import type { t as translate } from "@/lib/i18n";

type Which = "home" | "office";

// Shared address picking (search, GPS, selection) for the settings page and the
// onboarding flow — keeps the geocoding behaviour identical in both.
export function useAddressSearch(t: typeof translate) {
  const [picked, setPicked] = useState<{ home: Place | null; office: Place | null }>({
    home: null,
    office: null,
  });
  const [homeQuery, setHomeQuery] = useState("");
  const [officeQuery, setOfficeQuery] = useState("");
  const [homeMatches, setHomeMatches] = useState<Place[]>([]);
  const [officeMatches, setOfficeMatches] = useState<Place[]>([]);
  const [status, setStatus] = useState("");
  const [statusVariant, setStatusVariant] = useState<"" | "ok" | "bad">("");

  const debouncedSearch = useCallback(
    (which: Which, q: string) => {
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

  const gps = useCallback(
    (which: Which) => {
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
    },
    [t],
  );

  const selectPlace = useCallback((which: Which, place: Place) => {
    setPicked((p) => ({ ...p, [which]: place }));
    if (which === "home") {
      setHomeMatches([]);
      setHomeQuery("");
    } else {
      setOfficeMatches([]);
      setOfficeQuery("");
    }
  }, []);

  return {
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
  };
}
