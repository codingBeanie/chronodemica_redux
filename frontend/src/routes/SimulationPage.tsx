import { BarChart, ChartTooltip } from "@mantine/charts";
import { Button, Group, Table, Text } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import {
  parliamentPeriodsApi,
  partiesApi,
  popPeriodsApi,
  simulationApi,
  votesApi,
  votingSystemConfigsApi,
} from "../api/resources";
import type { ParliamentPeriod, Party, PopPeriod, VotingSystemConfig, Votes } from "../api/types";
import { DiagramSurface } from "../components/DiagramSurface";
import { InGovernmentIcon } from "../components/InGovernmentIcon";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContext } from "../context/PeriodContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";
import { partyDisplayAbbreviation, partyDisplayColor, partyDisplayName } from "../utils/partyDisplay";

type SortKey = "party" | "votes" | "seats" | "in_government";

// Shared across both bar charts: bigger axis/value-label text than Mantine's
// hardcoded 12px default, for readability.
const chartFontProps = {
  xAxisProps: { tick: { transform: "translate(0, 10)", fontSize: 14, fill: "currentColor" } },
  yAxisProps: { tick: { transform: "translate(-10, 0)", fontSize: 14, fill: "currentColor" } },
  valueLabelProps: { fontSize: 14 },
};

// The x-axis shows each party's short abbreviation, but the tooltip header should
// read the full name — the row's own `name` field, not the dataKey Recharts defaults
// to as `label`. Mantine's BarChart ignores a plain `labelFormatter` (its `content`
// override doesn't apply one), so the tooltip content itself is rebuilt here, reusing
// Mantine's own <ChartTooltip> for identical styling.
function renderPartyTooltip(
  valueFormatter: (value: number) => string,
  series: Array<{ name: string; label?: string; color?: MantineColor }>,
) {
  return ({
    label,
    payload,
  }: {
    label?: string;
    payload?: Array<{ payload?: { name?: string } }>;
  }) => (
    <ChartTooltip
      label={payload?.[0]?.payload?.name ?? label}
      payload={payload}
      series={series}
      valueFormatter={valueFormatter}
    />
  );
}

export function SimulationPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId } = usePeriodContext();
  const [parties, setParties] = useState<Party[]>([]);
  const [votes, setVotes] = useState<Votes[]>([]);
  const [parliamentPeriods, setParliamentPeriods] = useState<ParliamentPeriod[]>([]);
  const [popPeriods, setPopPeriods] = useState<PopPeriod[]>([]);
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
  // Raw hex from user-defined party data, not a Mantine theme token — Recharts accepts any CSS color.
  const partyColor = (id: number | null): MantineColor => partyDisplayColor(id, parties) as MantineColor;
  const hasResults = votes.length > 0 || parliamentPeriods.length > 0;

  const totalEligibleVoters = popPeriods.reduce((sum, pp) => sum + pp.population * pp.eligibility, 0);
  const totalVotesCast = popPeriods.reduce(
    (sum, pp) => sum + pp.population * pp.eligibility * pp.turnout,
    0,
  );
  const turnoutRate = totalEligibleVoters > 0 ? (totalVotesCast / totalEligibleVoters) * 100 : null;

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

  // One bar per party, each carrying its own color — Mantine's BarChart renders a
  // per-row <Cell> automatically when a data row has a `color` field, so no legend
  // is needed; the abbreviation on the x-axis identifies each bar directly.
  const votesChartData = sortedPartyIds.map((id) => ({
    abbreviation: partyAbbreviation(id),
    name: partyName(id),
    value: totalNationalVotes > 0 ? ((nationalTotals.get(id) ?? 0) / totalNationalVotes) * 100 : 0,
    color: partyColor(id),
  }));
  const percentFormatter = (value: number) => `${value.toFixed(1)}%`;
  const votesSeries = [{ name: "value", label: t.simulation.columnNationalVotes, color: "gray.5" }];

  const previousNationalTotals = new Map<number | null, number>();
  for (const vote of previousVotes) {
    previousNationalTotals.set(vote.party_id, (previousNationalTotals.get(vote.party_id) ?? 0) + vote.votes);
  }
  const previousTotalVotes = [...previousNationalTotals.values()].reduce((sum, v) => sum + v, 0);
  const comparisonPartyIds = [...new Set([...sortedPartyIds, ...previousNationalTotals.keys()])].sort(
    (a, b) => (nationalTotals.get(b) ?? 0) - (nationalTotals.get(a) ?? 0),
  );
  // Diverging color by direction of change (gain/loss), not by party identity — this
  // chart's job is showing whether a party grew or shrank, not who's who.
  const comparisonChartData = comparisonPartyIds.map((id) => {
    const previousPercent =
      previousTotalVotes > 0 ? ((previousNationalTotals.get(id) ?? 0) / previousTotalVotes) * 100 : 0;
    const currentPercent =
      totalNationalVotes > 0 ? ((nationalTotals.get(id) ?? 0) / totalNationalVotes) * 100 : 0;
    const change = currentPercent - previousPercent;
    return {
      abbreviation: partyAbbreviation(id),
      name: partyName(id),
      change,
      color: change > 0 ? "green.6" : change < 0 ? "red.6" : "gray.5",
    };
  });
  const changeFormatter = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  const comparisonSeries = [{ name: "change", label: t.simulation.changeSeries, color: "gray.5" }];

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
              <Group justify="space-between" align="baseline" mb="sm">
                <Text fw={600}>{t.simulation.votesChartTitle}</Text>
                {turnoutRate !== null && (
                  <Text size="xs" c="dimmed">
                    {t.simulation.turnoutLabel(turnoutRate)}
                  </Text>
                )}
              </Group>
              <DiagramSurface mb="xl">
                <BarChart
                  h={300}
                  data={votesChartData}
                  dataKey="abbreviation"
                  series={votesSeries}
                  withBarValueLabel
                  valueFormatter={percentFormatter}
                  maxBarWidth={80}
                  {...chartFontProps}
                  tooltipProps={{ content: renderPartyTooltip(percentFormatter, votesSeries) }}
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
                    dataKey="abbreviation"
                    series={comparisonSeries}
                    withBarValueLabel
                    valueFormatter={changeFormatter}
                    maxBarWidth={40}
                    barChartProps={{ barCategoryGap: "20%" }}
                    {...chartFontProps}
                    tooltipProps={{ content: renderPartyTooltip(changeFormatter, comparisonSeries) }}
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
