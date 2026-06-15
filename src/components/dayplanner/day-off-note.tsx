"use client";

import { Button } from "@/components/ui/button";

type DayOffNoteProps = {
  message: string;
  showTimes: boolean;
  hideLabel: string;
  showLabel: string;
  onToggle: () => void;
};

export function DayOffNote({ message, showTimes, hideLabel, showLabel, onToggle }: DayOffNoteProps) {
  return (
    <div
      role="status"
      className="mb-3 rounded-[18px] border border-outline bg-primary-container px-4 py-4 text-center text-base font-bold text-on-primary-container"
    >
      <div>{message}</div>
      <Button variant="soft" className="mt-2.5 min-h-0 px-3.5 py-1.5 text-xs" onClick={onToggle}>
        {showTimes ? hideLabel : showLabel}
      </Button>
    </div>
  );
}
