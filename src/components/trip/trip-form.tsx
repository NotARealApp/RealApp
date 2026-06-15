"use client";

import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/input";

type TripFormProps = {
  dest: string;
  start: string;
  end: string;
  minDate: string;
  onDestChange: (v: string) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  t: (key: string) => string;
};

export function TripForm({
  dest,
  start,
  end,
  minDate,
  onDestChange,
  onStartChange,
  onEndChange,
  onSubmit,
  t,
}: TripFormProps) {
  return (
    <Card className="flex flex-col gap-3.5">
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>{t("tr.whereTo")}</FieldLabel>
          <Input value={dest} onChange={(e) => onDestChange(e.target.value)} placeholder={t("tr.cityPh")} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>{t("tr.from")}</FieldLabel>
            <Input type="date" value={start} min={minDate} onChange={(e) => onStartChange(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>{t("tr.to")}</FieldLabel>
            <Input type="date" value={end} onChange={(e) => onEndChange(e.target.value)} />
          </label>
        </div>
        <Button type="submit" fullWidth>
          {t("tr.plan")}
        </Button>
      </form>
    </Card>
  );
}
