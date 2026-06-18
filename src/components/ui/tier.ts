export function leaveTierClass(tier: string) {
  if (tier === "urgent") return "text-status-bad";
  if (tier === "soon") return "text-status-warn";
  return "text-status-good";
}
