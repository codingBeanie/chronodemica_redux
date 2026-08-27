import { API_BASE_URL, apiFetch, apiHeaders } from "./client";
import type {
  CoalitionsResult,
  MeResponse,
  ParliamentPeriod,
  Party,
  PartyInput,
  PartyPeriod,
  PartyPeriodInput,
  PartyStatement,
  PartyStatementInput,
  Period,
  PeriodInput,
  Pop,
  PopInput,
  PopPeriod,
  PopPeriodInput,
  PopStatement,
  PopStatementInput,
  Statement,
  StatementInput,
  Topic,
  TopicInput,
  TopicPeriod,
  TopicPeriodInput,
  VotingBehaviour,
  Votes,
  VotingSystemConfig,
  World,
  WorldInput,
} from "./types";

type Filters = Record<string, number | undefined>;

function toQuery(filters?: Filters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function createResource<T, TInput>(path: string) {
  return {
    list: (filters?: Filters) => apiFetch<T[]>(`${path}/${toQuery(filters)}`),
    create: (input: TInput) => apiFetch<T>(`${path}/`, { method: "POST", body: JSON.stringify(input) }),
    update: (id: number, input: Partial<TInput>) =>
      apiFetch<T>(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: number) => apiFetch<void>(`${path}/${id}`, { method: "DELETE" }),
  };
}

function createReadOnlyResource<T>(path: string) {
  return {
    list: (filters?: Filters) => apiFetch<T[]>(`${path}/${toQuery(filters)}`),
  };
}

export const authApi = {
  loginUrl: `${API_BASE_URL}/api/auth/oidc/login`,
  logout: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
  me: () => apiFetch<MeResponse>("/api/auth/me"),
};

export const worldsApi = createResource<World, WorldInput>("/api/worlds");

// These act on a specific world via an explicit `X-World-Id` override, so they can be
// triggered from a row in the Worlds list without first switching into that world.
export const worldApi = {
  seedDemoData: (worldId: number) =>
    apiFetch<{ status: string }>("/api/world/seed-demo-data", {
      method: "POST",
      headers: { "X-World-Id": String(worldId) },
    }),
  deleteAllData: (worldId: number) =>
    apiFetch<{ status: string }>("/api/world/data", {
      method: "DELETE",
      headers: { "X-World-Id": String(worldId) },
    }),
  exportWorld: async (worldId: number): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/world/export`, {
      headers: { ...apiHeaders(false), "X-World-Id": String(worldId) },
    });
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${await response.text()}`);
    }
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return { blob: await response.blob(), filename: match?.[1] ?? "world.db" };
  },
  importWorld: async (worldId: number, file: File): Promise<World> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/api/world/import`, {
      method: "POST",
      headers: { ...apiHeaders(false), "X-World-Id": String(worldId) },
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${await response.text()}`);
    }
    return response.json() as Promise<World>;
  },
};

export const partiesApi = createResource<Party, PartyInput>("/api/parties");
export const popsApi = createResource<Pop, PopInput>("/api/pops");
export const topicsApi = createResource<Topic, TopicInput>("/api/topics");
export const statementsApi = createResource<Statement, StatementInput>("/api/statements");
export const periodsApi = createResource<Period, PeriodInput>("/api/periods");
export const partyPeriodsApi = createResource<PartyPeriod, PartyPeriodInput>("/api/party-periods");
export const popPeriodsApi = createResource<PopPeriod, PopPeriodInput>("/api/pop-periods");
export const topicPeriodsApi = createResource<TopicPeriod, TopicPeriodInput>("/api/topic-periods");
export const partyStatementsApi = createResource<PartyStatement, PartyStatementInput>(
  "/api/party-statements",
);
export const popStatementsApi = createResource<PopStatement, PopStatementInput>("/api/pop-statements");

export const votesApi = createReadOnlyResource<Votes>("/api/votes");

export const parliamentPeriodsApi = {
  ...createReadOnlyResource<ParliamentPeriod>("/api/parliament-periods"),
  setInGovernment: (id: number, inGovernment: boolean) =>
    apiFetch<ParliamentPeriod>(`/api/parliament-periods/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ in_government: inGovernment }),
    }),
};

export const votingSystemConfigsApi = createReadOnlyResource<VotingSystemConfig>("/api/voting-systems");

export const votingBehaviourApi = {
  get: (periodId: number, popId: number) =>
    apiFetch<VotingBehaviour>(`/api/periods/${periodId}/voting-behaviour?pop_id=${popId}`),
};

export const coalitionsApi = {
  get: (periodId: number) => apiFetch<CoalitionsResult>(`/api/periods/${periodId}/coalitions`),
};

export const simulationApi = {
  run: (periodId: number) => apiFetch<{ status: string }>(`/api/periods/${periodId}/simulate`, { method: "POST" }),
  clear: (periodId: number) => apiFetch<void>(`/api/periods/${periodId}/simulation`, { method: "DELETE" }),
};
