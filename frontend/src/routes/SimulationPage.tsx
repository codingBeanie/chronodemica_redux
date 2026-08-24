import { BarChart } from "@mantine/charts";
import { Button, Group, Table, Text } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import {
  parliamentPeriodsApi,
  partiesApi,
  simulationApi,
  votesApi,
  votingSystemConfigsApi,
} from "../api/resources";
import type { ParliamentPeriod, Party, VotingSystemConfig, Votes } from "../api/types";
import { DiagramSurface } from "../components/DiagramSurface";
import { InGovernmentIcon } from "../components/InGovernmentIcon";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContext } from "../context/PeriodContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";
import { partyDisplayColor, partyDisplayName } from "../utils/partyDisplay";

type SortKey = "party" | "votes" | "seats" | "in_government";

export function SimulationPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId } = usePeriodContext();
  const [parties, setParties] = useState<Party[]>([]);
  const [votes, setVotes] = useState<Votes[]>([]);
  const [parliamentPeriods, setParliamentPeriods] = useState<ParliamentPeriod[]>([]);
  const [previousVotes, setPreviousVotes] = useState<Votes[]>([]);
  const [votingSystemConfigs, setVotingSystemConfigs] = useState<VotingSystemConfig[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    partiesApi.list().then(setParties);
    votingSystemConfigsApi.list().then(setVotingSystemConfigs);
  }, []);

  const refresh = () => {
    if (!selectedPeriodId) {
      setVotes([]);
      setParliamentPeriods([]);
      return;
    }
    votesApi.list({ period_id: selectedPeriodId }).then(setVotes);
    parliamentPeriodsApi.list({ period_id: selectedPeriodId }).then(setParliamentPeriods);
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
  // Raw hex from user-defined party data, not a Mantine theme token — Recharts accepts any CSS color.
  const partyColor = (id: number | null): MantineColor => partyDisplayColor(id, parties) as MantineColor;
  const hasResults = votes.length > 0 || parliamentPeriods.length > 0;

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

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
  const thresholdPercent = votingSystemConfigs.find(
    (config) => config.value === selectedPeriod?.voting_system,
  )?.threshold_percent;
  const totalNationalVotes = [...nationalTotals.values()].reduce((sum, v) => sum + v, 0);

  const chartSeries = sortedPartyIds.map((id) => ({
    name: String(id),
    label: partyName(id),
    color: partyColor(id),
  }));
  const votesChartData = [
    Object.fromEntries([
      ["category", t.simulation.columnNationalVotes],
      ...sortedPartyIds.map((id) => [
        String(id),
        totalNationalVotes > 0 ? ((nationalTotals.get(id) ?? 0) / totalNationalVotes) * 100 : 0,
      ]),
    ]),
  ];
  const percentFormatter = (value: number) => `${value.toFixed(1)}%`;

  const previousNationalTotals = new Map<number | null, number>();
  for (const vote of previousVotes) {
    previousNationalTotals.set(vote.party_id, (previousNationalTotals.get(vote.party_id) ?? 0) + vote.votes);
  }
  const previousTotalVotes = [...previousNationalTotals.values()].reduce((sum, v) => sum + v, 0);
  const comparisonPartyIds = [...new Set([...sortedPartyIds, ...previousNationalTotals.keys()])].sort(
    (a, b) => (nationalTotals.get(b) ?? 0) - (nationalTotals.get(a) ?? 0),
  );
  const comparisonChartData = comparisonPartyIds.map((id) => ({
    party: partyName(id),
    previous:
      previousTotalVotes > 0 ? ((previousNationalTotals.get(id) ?? 0) / previousTotalVotes) * 100 : 0,
    current: totalNationalVotes > 0 ? ((nationalTotals.get(id) ?? 0) / totalNationalVotes) * 100 : 0,
  }));

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

  const handleDelete = async () => {
    if (!selectedPeriodId || !window.confirm(t.simulation.confirmDelete)) return;
    await simulationApi.clear(selectedPeriodId);
    refresh();
  };

  return (
    <>
      <Text size="xl" fw={700} mb="md">
        {t.simulation.pageTitle}
      </Text>

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
              <Button color="red" variant="outline" onClick={handleDelete}>
                {t.simulation.deleteButton}
              </Button>
            )}
          </Group>

          {hasResults && (
            <>
              <Text fw={600} mb="sm">
                {t.simulation.votesChartTitle}
              </Text>
              <DiagramSurface mb="xl">
                <BarChart
                  h={300}
                  data={votesChartData}
                  dataKey="category"
                  series={chartSeries}
                  withLegend
                  withBarValueLabel
                  valueFormatter={percentFormatter}
                  withXAxis={false}
                  maxBarWidth={80}
                  barChartProps={{ barGap: 8 }}
                  referenceLines={
                    thresholdPercent !== undefined
                      ? [
                          {
                            y: thresholdPercent,
                            label: t.simulation.thresholdLabel(thresholdPercent),
                            color: "gray.6",
                          },
                        ]
                      : []
                  }
                />
              </DiagramSurface>

              <Text fw={600} mb="sm">
                {t.simulation.votesComparisonChartTitle}
              </Text>
              {!previousPeriod && (
                <Text c="dimmed" size="sm" mb="xl">
                  {t.simulation.noPreviousPeriodForComparison}
                </Text>
              )}
              {previousPeriod && previousVotes.length === 0 && (
                <Text c="dimmed" size="sm" mb="xl">
                  {t.simulation.previousPeriodNoResults}
                </Text>
              )}
              {previousPeriod && previousVotes.length > 0 && (
                <DiagramSurface mb="xl">
                  <BarChart
                    h={300}
                    data={comparisonChartData}
                    dataKey="party"
                    series={[
                      { name: "previous", label: t.simulation.previousPeriodSeries, color: "gray.5" },
                      { name: "current", label: t.simulation.currentPeriodSeries, color: "blue.6" },
                    ]}
                    withLegend
                    withBarValueLabel
                    valueFormatter={percentFormatter}
                    maxBarWidth={40}
                    barChartProps={{ barGap: 4, barCategoryGap: "20%" }}
                  />
                </DiagramSurface>
              )}

              <Text fw={600} mb="sm">
                {t.simulation.resultsTitle}
              </Text>
              <Table striped highlightOnHover>
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
                  {sortedTablePartyIds.map((partyId) => (
                    <Table.Tr key={String(partyId)}>
                      <Table.Td>{partyName(partyId)}</Table.Td>
                      <Table.Td ta="right">{(nationalTotals.get(partyId) ?? 0).toLocaleString()}</Table.Td>
                      <Table.Td ta="right">
                        {parliamentPeriods.find((p) => p.party_id === partyId)?.seats ?? 0}
                      </Table.Td>
                      <Table.Td>
                        <InGovernmentIcon
                          inGovernment={parliamentPeriods.find((p) => p.party_id === partyId)?.in_government ?? false}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          )}
        </>
      )}
    </>
  );
}
