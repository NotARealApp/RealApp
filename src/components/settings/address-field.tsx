"use client";

import { Chip } from "@/components/ui/chip";
import { FieldLabel, Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Place } from "@/lib/planner-settings";

type AddressFieldProps = {
  title: string;
  query: string;
  placeholder: string;
  gpsLabel: string;
  noPickLabel: string;
  picked: Place | null;
  matches: Place[];
  onQueryChange: (q: string) => void;
  onGps: () => void;
  onSelect: (place: Place) => void;
};

export function AddressField({
  title,
  query,
  placeholder,
  gpsLabel,
  noPickLabel,
  picked,
  matches,
  onQueryChange,
  onGps,
  onSelect,
}: AddressFieldProps) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <IconButton type="button" onClick={onGps} aria-label={gpsLabel} title={gpsLabel}>
          📍
        </IconButton>
      </div>
      {matches.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {matches.map((r) => (
            <Chip key={r.label} onClick={() => onSelect(r)}>
              {r.label}
            </Chip>
          ))}
        </div>
      )}
      <div
        className={cn(
          "mt-2.5 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm",
          picked
            ? "border border-primary/40 bg-primary/10 text-on-surface"
            : "border border-dashed border-outline text-on-surface-variant",
        )}
      >
        {picked ? `📍 ${picked.label}` : noPickLabel}
      </div>
    </Card>
  );
}

export function TimeFields({
  title,
  arrivalLabel,
  returnLabel,
  arrival,
  returnTime,
  onArrivalChange,
  onReturnChange,
}: {
  title: string;
  arrivalLabel: string;
  returnLabel: string;
  arrival: string;
  returnTime: string;
  onArrivalChange: (v: string) => void;
  onReturnChange: (v: string) => void;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <FieldLabel>{arrivalLabel}</FieldLabel>
          <Input type="time" value={arrival} onChange={(e) => onArrivalChange(e.target.value)} className="mt-1.5" />
        </label>
        <label>
          <FieldLabel>{returnLabel}</FieldLabel>
          <Input type="time" value={returnTime} onChange={(e) => onReturnChange(e.target.value)} className="mt-1.5" />
        </label>
      </div>
    </Card>
  );
}

export function StatusMessage({ message, variant }: { message: string; variant?: "ok" | "bad" | "" }) {
  return (
    <p
      className={cn(
        "my-2.5 min-h-[1.2em] text-center text-sm",
        variant === "ok" && "text-status-good",
        variant === "bad" && "text-status-bad",
        !variant && "text-on-surface-variant",
      )}
    >
      {message}
    </p>
  );
}
