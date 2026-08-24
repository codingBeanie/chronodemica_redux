import type { Party } from "../api/types";

// A party id of null is the "Misc" bucket — votes/points that couldn't be
// attributed to any real party. It has no Party row of its own, so it's
// resolved here rather than by looking one up.
const MISC_COLOR = "#adb5bd";

export function partyDisplayName(partyId: number | null, parties: Party[]): string {
  if (partyId === null) return "Misc";
  return parties.find((p) => p.id === partyId)?.name ?? "-";
}

export function partyDisplayColor(partyId: number | null, parties: Party[]): string {
  if (partyId === null) return MISC_COLOR;
  return parties.find((p) => p.id === partyId)?.color_bg ?? MISC_COLOR;
}
