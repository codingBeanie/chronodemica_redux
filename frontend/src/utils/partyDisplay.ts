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

export function partyDisplayAbbreviation(partyId: number | null, parties: Party[]): string {
  if (partyId === null) return "Misc";
  return parties.find((p) => p.id === partyId)?.abbreviation ?? "-";
}

/** Whether `party` already existed and hadn't yet dissolved as of `votingDate`. */
export function isPartyActiveAt(party: Party, votingDate: string): boolean {
  const year = new Date(votingDate).getFullYear();
  if (party.founded !== null && year < party.founded) return false;
  if (party.dissolved !== null && year > party.dissolved) return false;
  return true;
}
