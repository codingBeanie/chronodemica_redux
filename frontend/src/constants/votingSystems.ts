export const VOTING_SYSTEMS = [
  {
    value: "proportional_representation",
    label: "Proportional Representation (Sainte-Laguë, 5% threshold)",
  },
  {
    value: "proportional_natural_threshold",
    label: "Proportional Representation (Sainte-Laguë, natural threshold — no % cutoff)",
  },
] as const;

export type VotingSystem = (typeof VOTING_SYSTEMS)[number]["value"];

export function votingSystemLabel(value: string): string {
  return VOTING_SYSTEMS.find((system) => system.value === value)?.label ?? value;
}
