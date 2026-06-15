"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type DayStepperProps = {
  dayName: string;
  dayDate: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
};

export function DayStepper({
  dayName,
  dayDate,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: DayStepperProps) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-outline bg-surface-container px-2 py-1" role="group" aria-label="Day">
      <button
        type="button"
        disabled={prevDisabled}
        onClick={onPrev}
        aria-label="Previous day"
        className="flex size-10 items-center justify-center rounded-lg text-on-surface disabled:opacity-30"
      >
        ‹
      </button>
      <div className="text-center" aria-live="polite">
        <div className="font-bold">{dayName}</div>
        <div className="text-sm text-on-surface-variant">{dayDate}</div>
      </div>
      <button
        type="button"
        disabled={nextDisabled}
        onClick={onNext}
        aria-label="Next day"
        className="flex size-10 items-center justify-center rounded-lg text-on-surface disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}

export function PullIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="fixed start-1/2 top-2 z-90 -translate-x-1/2 rounded-[14px] bg-primary-container px-4 py-2 text-xs font-semibold text-on-primary-container shadow-lg"
    >
      ↻ Refreshing…
    </div>
  );
}

export function StickyLeaveBar({
  visible,
  icon,
  time,
  onClick,
}: {
  visible: boolean;
  icon: string;
  time: string;
  onClick: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      role="status"
      onClick={onClick}
      className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-2 border-t border-outline bg-surface-container px-4 py-3 text-sm font-semibold shadow-lg"
    >
      <span>{icon}</span>
      <span>{time}</span>
    </button>
  );
}

export function HintToast({
  message,
  dismissLabel,
  onDismiss,
}: {
  message: string;
  dismissLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-outline bg-surface-container p-4 shadow-elev-2"
    >
      <span className="flex-1 text-sm">{message}</span>
      <Button variant="soft" className="min-h-9 shrink-0 px-4 py-2 text-xs" onClick={onDismiss}>
        {dismissLabel}
      </Button>
    </div>
  );
}

export function UndoToast({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-outline bg-surface-container p-4 shadow-elev-2"
    >
      <span className="flex-1 text-sm">{message}</span>
      <Button variant="soft" className="min-h-9 shrink-0 px-4 py-2 text-xs" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

export function UpdatedFooter({
  text,
  stale,
  forceLabel,
  onForceUpdate,
}: {
  text: string;
  stale: boolean;
  forceLabel: string;
  onForceUpdate: () => void;
}) {
  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      {text && (
        <p className={cn("text-center text-xs text-on-surface-variant", stale && "text-status-warn")}>
          {text}
        </p>
      )}
      <button
        type="button"
        onClick={onForceUpdate}
        className="text-xs text-on-surface-variant underline-offset-2 hover:underline"
      >
        {forceLabel}
      </button>
    </div>
  );
}
