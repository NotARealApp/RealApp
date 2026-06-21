"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { AddressField, StatusMessage } from "@/components/settings/address-field";
import { useI18n } from "@/context/I18nProvider";
import { useAddressSearch } from "@/hooks/use-address-search";
import type { Lang } from "@/lib/i18n";
import { DEFAULT_PLACES, savePlannerSettings, type PlannerSettings } from "@/lib/planner-settings";

export function Onboarding() {
  const { t, lang, setLanguage } = useI18n();
  const router = useRouter();
  const {
    picked,
    homeQuery,
    setHomeQuery,
    officeQuery,
    setOfficeQuery,
    homeMatches,
    officeMatches,
    status,
    statusVariant,
    setStatus,
    setStatusVariant,
    gps,
    selectPlace,
  } = useAddressSearch(t);
  function finish() {
    if (!picked.home || !picked.office) {
      setStatus(t("set.pickBoth"));
      setStatusVariant("bad");
      return;
    }
    // Times default to the usual 9–6; editable later in Settings. Onboarding
    // asks only for the two addresses it can't work without.
    const settings: PlannerSettings = {
      home: picked.home,
      office: picked.office,
      officeArrival: DEFAULT_PLACES.officeArrival,
      homeReturn: DEFAULT_PLACES.homeReturn,
    };
    savePlannerSettings(settings);
    router.push("/dayplanner");
  }

  return (
    <div className="space-y-3">
      <header className="px-1 pt-2 text-center">
        <h1 className="font-display text-2xl font-semibold">{t("ob.welcome")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("ob.subtitle")}</p>
      </header>

      {/* Privacy reassurance — nothing leaves the device. */}
      <div className="flex items-start gap-3 rounded-[28px] bg-secondary-container px-5 py-4 text-on-secondary-container">
        <span className="text-2xl">🔒</span>
        <p className="text-sm leading-snug">{t("ob.privacy")}</p>
      </div>

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
        onGps={() => gps("home")}
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
        onGps={() => gps("office")}
        onSelect={(p) => selectPlace("office", p)}
      />

      <StatusMessage message={status} variant={statusVariant} />

      <Button fullWidth onClick={finish}>
        {t("ob.start")}
      </Button>
    </div>
  );
}
