import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanTimePicker } from "./plan-time-picker";
import type { PlanTime } from "@/lib/dayplanner/logic";

// t passthrough → labels render as their keys, so we can query by key.
const t = (k: string) => k;
const NOW: PlanTime = { mode: "now", time: "" };
const timeInput = () => document.querySelector('input[type="time"]') as HTMLInputElement;

describe("PlanTimePicker", () => {
  it("collapsed shows the plan-time prompt when no plan is active", () => {
    render(<PlanTimePicker value={NOW} onChange={() => {}} t={t} />);
    expect(screen.getByText(/dp\.planTime/)).toBeInTheDocument();
    expect(timeInput()).toBeNull(); // not expanded
  });

  it("collapsed shows the active plan label", () => {
    render(<PlanTimePicker value={{ mode: "arrive", time: "09:00" }} onChange={() => {}} t={t} />);
    expect(screen.getByText(/dp\.arriveBy 09:00/)).toBeInTheDocument();
  });

  it("opening seeds the toggle from the active plan", () => {
    render(<PlanTimePicker value={{ mode: "arrive", time: "09:00" }} onChange={() => {}} t={t} />);
    fireEvent.click(screen.getByText(/dp\.arriveBy 09:00/));
    expect(screen.getByRole("button", { name: "dp.arriveBy" })).toHaveAttribute("aria-pressed", "true");
    expect(timeInput().value).toBe("09:00");
  });

  it("selecting Now resets to live immediately (no Show routes needed)", () => {
    const onChange = vi.fn();
    render(<PlanTimePicker value={{ mode: "arrive", time: "09:00" }} onChange={onChange} t={t} />);
    fireEvent.click(screen.getByText(/dp\.arriveBy 09:00/)); // open
    fireEvent.click(screen.getByRole("button", { name: "dp.useNow" }));
    expect(onChange).toHaveBeenCalledWith({ mode: "now", time: "" });
  });

  it("Leave/Arrive edits are a draft committed only via Show routes", () => {
    const onChange = vi.fn();
    render(<PlanTimePicker value={NOW} onChange={onChange} t={t} />);
    fireEvent.click(screen.getByText(/dp\.planTime/)); // open editor

    fireEvent.click(screen.getByRole("button", { name: "dp.arriveBy" }));
    expect(onChange).not.toHaveBeenCalled(); // still a draft

    fireEvent.change(timeInput(), { target: { value: "08:30" } });
    fireEvent.click(screen.getByRole("button", { name: "dp.showRoutes" }));
    expect(onChange).toHaveBeenCalledWith({ mode: "arrive", time: "08:30" });
  });

  it("Show routes is disabled until the draft differs from the applied plan", () => {
    const onChange = vi.fn();
    render(<PlanTimePicker value={{ mode: "arrive", time: "09:00" }} onChange={onChange} t={t} />);
    fireEvent.click(screen.getByText(/dp\.arriveBy 09:00/)); // open, draft == applied

    const show = screen.getByRole("button", { name: "dp.showRoutes" });
    expect(show).toBeDisabled();

    fireEvent.change(timeInput(), { target: { value: "09:30" } });
    expect(show).toBeEnabled();
    fireEvent.click(show);
    expect(onChange).toHaveBeenCalledWith({ mode: "arrive", time: "09:30" });
  });
});
