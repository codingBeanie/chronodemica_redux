import { Button, Group, Table, Text, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Fragment, useEffect, useState } from "react";

import { parliamentPeriodsApi, partiesApi, popPeriodsApi, popsApi, simulationApi, votesApi } from "../api/resources";
import type { ParliamentPeriod, Party, Pop, PopPeriod, Votes } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { DiagramSurface } from "../components/DiagramSurface";
import { InGovernmentIcon } from "../components/InGovernmentIcon";
import { PageHeader } from "../components/PageHeader";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { VotingResultsChart } from "../components/VotingResultsChart";
import { usePeriodContext } from "../context/PeriodContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";
import {
  partyDisplayAbbreviation,
  partyDisplayColor,
  partyDisplayName,
  partyDisplayNameWithAbbreviation,
} from "../utils/partyDisplay";

type SortKey = "party" | "votes" | "seats" | "in_government";

export function SimulationPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId } = usePeriodContext();
  const [parties, setParties] = useState<Party[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [votes, setVotes] = useState<Votes[]>([]);
  const [parliamentPeriods, setParliamentPeriods] = useState<ParliamentPeriod[]>([]);
  const [popPeriods, setPopPeriods] = useState<PopPeriod[]>([]);
  const [previousVotes, setPreviousVotes] = useState<Votes[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedPartyKey, setExpandedPartyKey] = useState<string | null>(null);

  useEffect(() => {
    partiesApi.list().then(setParties);
    popsApi.list().then(setPops);
  }, []);

  const refresh = () => {
    if (!selectedPeriodId) {
      setVotes([]);
      setParliamentPeriods([]);
      setPopPeriods([]);
      return;
    }
    votesApi.list({ period_id: selectedPeriodId }).then(setVotes);
    parliamentPeriodsApi.list({ period_id: selectedPeriodId }).then(setParliamentPeriods);
    popPeriodsApi.list({ period_id: selectedPeriodId }).then(setPopPeriods);
  };

  useEffect(refresh, [selectedPeriodId]);

  const sortedPeriods = [...periods].sort((a, b) => a.voting_date.localeCompare(b.voting_date));
  const currentPeriodIndex = sortedPeriods.findIndex((p) => p.id === selectedPeriodId);
  const previousPeriod = currentPeriodIndex > 0 ? sortedPeriods[currentPeriodIndex - 1] : null;

  useEffect(() => {
    if (previousPeriod) {
      votesApi.list({ period_id: previousPeriod.id }).then(setPreviousVotes);
    } else {
      setPreviousVotes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousPeriod?.id]);

  const partyName = (id: number | null) => partyDisplayName(id, parties);
  const partyAbbreviation = (id: number | null) => partyDisplayAbbreviation(id, parties);
  const partyColor = (id: number | null): string => partyDisplayColor(id, parties);
  const popName = (id: number) => pops.find((pop) => pop.id === id)?.name ?? "-";
  const hasResults = votes.length > 0 || parliamentPeriods.length > 0;

  const toggleExpandedParty = (partyId: number | null) => {
    const key = String(partyId);
    setExpandedPartyKey((prev) => (prev === key ? null : key));
  };
  const votesByPopForParty = (partyId: number | null) =>
    votes
      .filter((vote) => vote.party_id === partyId)
      .map((vote) => ({ popId: vote.pop_id, name: popName(vote.pop_id), votes: vote.votes }))
      .sort((a, b) => b.votes - a.votes);

  const currentPeriod = periods.find((p) => p.id === selectedPeriodId);
  const totalVotesCast = popPeriods.reduce(
    (sum, pp) => sum + ((currentPeriod?.total_population ?? 0) * pp.share * pp.turnout) / 100,
    0,
  );
  const turnoutRate =
    currentPeriod && currentPeriod.total_population > 0 ? (totalVotesCast / currentPeriod.total_population) * 100 : null;

  const nationalTotals = new Map<number | null, number>();
  for (const vote of votes) {
    nationalTotals.set(vote.party_id, (nationalTotals.get(vote.party_id) ?? 0) + vote.votes);
  }
  const partyIds = [...new Set([...nationalTotals.keys(), ...parliamentPeriods.map((p) => p.party_id)])];
  // Chart order is always votes-descending; the results table below has its own
  // independent, user-toggleable sort (see sortedTablePartyIds).
  const sortedPartyIds = [...partyIds].sort(
    (a, b) => (nationalTotals.get(b) ?? 0) - (nationalTotals.get(a) ?? 0),
  );

  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("votes", "desc");
  const getSortValue = (partyId: number | null, key: SortKey): string | number => {
    if (key === "party") return partyName(partyId);
    if (key === "votes") return nationalTotals.get(partyId) ?? 0;
    const entry = parliamentPeriods.find((p) => p.party_id === partyId);
    if (key === "in_government") return entry?.in_government ? 1 : 0;
    return entry?.seats ?? 0;
  };
  const sortedTablePartyIds = [...partyIds].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
  );

  const totalNationalVotes = [...nationalTotals.values()].reduce((sum, v) => sum + v, 0);

  const previousNationalTotals = new Map<number | null, number>();
  for (const vote of previousVotes) {
    previousNationalTotals.set(vote.party_id, (previousNationalTotals.get(vote.party_id) ?? 0) + vote.votes);
  }
  const previousTotalVotes = [...previousNationalTotals.values()].reduce((sum, v) => sum + v, 0);

  // One column per party, votes-descending. A party with no comparable previous-period
  // value (no earlier period, or it simply didn't run then) gets `change: null`, shown
  // as a blank dash rather than suppressing the comparison for every other party too.
  const chartParties = sortedPartyIds.map((id) => {
    const percent = totalNationalVotes > 0 ? ((nationalTotals.get(id) ?? 0) / totalNationalVotes) * 100 : 0;
    const hasComparison = previousPeriod !== null && previousTotalVotes > 0 && previousNationalTotals.has(id);
    const change = hasComparison
      ? percent - ((previousNationalTotals.get(id) ?? 0) / previousTotalVotes) * 100
      : null;
    return { id: String(id), abbreviation: partyAbbreviation(id), color: partyColor(id), percent, change };
  });

  const handleRun = async () => {
    if (!selectedPeriodId) return;
    setRunning(true);
    try {
      await simulationApi.run(selectedPeriodId);
      refresh();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = () => {
    if (!selectedPeriodId) return;
    const periodId = selectedPeriodId;
    confirmDialog({
      tier: "routine",
      title: t.common.delete,
      message: t.simulation.confirmDelete,
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
        await simulationApi.clear(periodId);
        refresh();
      },
    });
  };

  return (
    <>
      <PageHeader title={t.simulation.pageTitle} />

      <PeriodSelector />

      {selectedPeriodId && (
        <>
          <Text c="dimmed" mb="md">
            {hasResults ? t.simulation.alreadyRun : t.simulation.notRunYet}
          </Text>

          <Group mb="md">
            <Button onClick={handleRun} loading={running}>
              {hasResults ? t.simulation.recalculateButton : t.simulation.runButton}
            </Button>
            {hasResults && (
              <Button color="red" variant="subtle" onClick={handleDelete}>
                {t.simulation.deleteButton}
              </Button>
            )}
          </Group>

          {hasResults && (
            <>
              <Group justify="space-between" align="baseline" mb="sm">
                <Text fw={600}>{t.simulation.votesChartTitle}</Text>
                {turnoutRate !== null && (
                  <Text size="xs" c="dimmed">
                    {t.simulation.turnoutLabel(turnoutRate)}
                  </Text>
                )}
              </Group>
              <DiagramSurface mb="xl">
                <VotingResultsChart parties={chartParties} />
              </DiagramSurface>

              <Text fw={600} mb="sm">
                {t.simulation.resultsTitle}
              </Text>
              <div style={{ overflowX: "auto" }}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <SortableTh
                        label={t.simulation.columnParty}
                        sortKey="party"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={toggleSort}
                      />
                      <SortableTh
                        label={t.simulation.columnNationalVotes}
                        sortKey="votes"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={toggleSort}
                        align="right"
                      />
                      <SortableTh
                        label={t.simulation.columnSeats}
                        sortKey="seats"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={toggleSort}
                        align="right"
                      />
                      <SortableTh
                        label={t.parliamentPeriods.columnInGovernment}
                        sortKey="in_government"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={toggleSort}
                      />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sortedTablePartyIds.map((partyId) => {
                      const rowKey = String(partyId);
                      const isExpanded = expandedPartyKey === rowKey;
                      const popBreakdown = votesByPopForParty(partyId);
                      return (
                        <Fragment key={rowKey}>
                          <Table.Tr>
                            <Table.Td>
                              <UnstyledButton
                                onClick={() => toggleExpandedParty(partyId)}
                                aria-expanded={isExpanded}
                                style={{ display: "flex", width: "100%" }}
                              >
                                <Group gap={6} wrap="nowrap">
                                  {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                                  <span>{partyDisplayNameWithAbbreviation(partyId, parties)}</span>
                                </Group>
                              </UnstyledButton>
                            </Table.Td>
                            <Table.Td ta="right">{(nationalTotals.get(partyId) ?? 0).toLocaleString()}</Table.Td>
                            <Table.Td ta="right">
                              {parliamentPeriods.find((p) => p.party_id === partyId)?.seats ?? 0}
                            </Table.Td>
                            <Table.Td>
                              <InGovernmentIcon
                                inGovernment={
                                  parliamentPeriods.find((p) => p.party_id === partyId)?.in_government ?? false
                                }
                              />
                            </Table.Td>
                          </Table.Tr>
                          {isExpanded &&
                            (popBreakdown.length === 0 ? (
                              <Table.Tr>
                                <Table.Td colSpan={4}>
                                  <Text size="sm" c="dimmed" pl="xl">
                                    {t.simulation.votesByPopEmpty}
                                  </Text>
                                </Table.Td>
                              </Table.Tr>
                            ) : (
                              popBreakdown.map((row) => (
                                <Table.Tr key={row.popId}>
                                  <Table.Td pl="xl">
                                    <Text size="sm" c="dimmed">
                                      {row.name}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td ta="right">
                                    <Text size="sm" c="dimmed">
                                      {row.votes.toLocaleString()}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td />
                                  <Table.Td />
                                </Table.Tr>
                              ))
                            ))}
                        </Fragment>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
