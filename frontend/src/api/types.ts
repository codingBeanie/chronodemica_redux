import type { VotingSystem } from "../constants/votingSystems";

export interface World {
  id: number;
  owner_id: number | null;
  name: string;
  parliament_name: string;
}
export type WorldInput = Omit<World, "id" | "owner_id">;

export interface AuthStatus {
  configured: boolean;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface Party {
  id: number;
  world_id: number;
  abbreviation: string;
  name: string;
  color_bg: string;
  color_text: string;
  founded: number | null;
  dissolved: number | null;
  seat_orientation: number;
}
export type PartyInput = Omit<Party, "id" | "world_id">;

export interface Pop {
  id: number;
  world_id: number;
  abbreviation: string;
  name: string;
}
export type PopInput = Omit<Pop, "id" | "world_id">;

export interface Topic {
  id: number;
  world_id: number;
  name: string;
  description: string;
}
export type TopicInput = Omit<Topic, "id" | "world_id">;

export interface Statement {
  id: number;
  topic_id: number;
  text: string;
}
export type StatementInput = Omit<Statement, "id">;

export interface Period {
  id: number;
  world_id: number;
  voting_date: string;
  start_date: string;
  end_date: string;
  voting_system: VotingSystem;
  seats: number;
}
export type PeriodInput = Omit<Period, "id" | "world_id">;

export interface VotingSystemConfig {
  value: VotingSystem;
  threshold_percent: number;
  apportionment_method: string;
}

export interface VotingBehaviourStatementRow {
  statement_id: number;
  topic_id: number;
  approval: number;
  // Keyed by String(party_id), or "null" for the "Misc" bucket (see VotingBehaviour.party_ids).
  party_points: Record<string, number>;
}

export interface VotingBehaviour {
  total_points: number;
  // null marks the "Misc" bucket: points from statements no real party approved.
  party_ids: (number | null)[];
  statements: VotingBehaviourStatementRow[];
}

export interface Coalition {
  party_ids: number[];
  total_seats: number;
  spread: number;
}

export interface CoalitionsResult {
  total_seats: number;
  majority_threshold: number;
  coalitions: Coalition[];
}

export interface PartyPeriod {
  id: number;
  party_id: number;
  period_id: number;
  popularity: number;
}
export type PartyPeriodInput = Omit<PartyPeriod, "id">;

export interface PopPeriod {
  id: number;
  pop_id: number;
  period_id: number;
  population: number;
  turnout: number;
  eligibility: number;
}
export type PopPeriodInput = Omit<PopPeriod, "id">;

export interface TopicPeriod {
  id: number;
  topic_id: number;
  period_id: number;
  importance: number;
}
export type TopicPeriodInput = Omit<TopicPeriod, "id">;

export interface PartyStatement {
  id: number;
  party_id: number;
  statement_id: number;
  period_id: number;
  approved: boolean;
}
export type PartyStatementInput = Omit<PartyStatement, "id">;

export interface PopStatement {
  id: number;
  pop_id: number;
  statement_id: number;
  period_id: number;
  approval: number;
}
export type PopStatementInput = Omit<PopStatement, "id">;

export interface Votes {
  id: number;
  period_id: number;
  // null marks the "Misc" bucket: votes for statements no real party approved.
  party_id: number | null;
  pop_id: number;
  votes: number;
}

export interface ParliamentPeriod {
  id: number;
  period_id: number;
  party_id: number;
  seats: number;
  in_government: boolean;
}
