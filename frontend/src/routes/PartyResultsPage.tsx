import { LineChart } from "@mantine/charts";
import { ColorSwatch, Group, Select, Stack, Text } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { useEffect, useState } from "react";

import { partiesApi, votesApi } from "../api/resources";
import type { Party, Votes } from "../api/types";
import { ChipScroller } from "../components/ChipScroller";
import { DiagramSurface } from "../components/DiagramSurface";
import { PageHeader } from "../components/PageHeader";
import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";
import { themeConfig } from "../theme.config";

// Series keys are derived from the party id, not its abbreviation — recharts reads a
// "." in a dataKey as a nested path, and abbreviations aren't guaranteed unique.
const seriesKey = (partyId: number) => `party_${partyId}`;

export function PartyResultsPage() {
  const t = useTranslation();
  const { periods } = usePeriodContext();
  const [parties, setParties] = useState<Party[]>([]);
  const [votes, setVotes] = useState<Votes[]>([]);
  // null = untouched by the user, fall back to the defaults derived below.
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[] | null>(null);
  const [fromPeriodId, setFromPeriodId] = useState<string | null>(null);
  const [toPeriodId, setToPeriodId] = useState<string | null>(null);

  useEffect(() => {
    partiesApi.list().then(setParties);
    // Unfiltered: every period's votes at once, for a history-spanning chart.
    votesApi.list().then(setVotes);
  }, []);

  // National vote totals per period — same formula as the Election page: the Misc
  // bucket (party_id null) counts toward the total but isn't a selectable party.
  const totalsByPeriod = new Map<number, { total: number; byParty: Map<number, number> }>();
  for (const vote of votes) {
    const entry = totalsByPeriod.get(vote.period_id) ?? { total: 0, byParty: new Map<number, number>() };
    entry.total += vote.votes;
    if (vote.party_id !== null) {
      entry.byParty.set(vote.party_id, (entry.byParty.get(vote.party_id) ?? 0) + vote.votes);
    }
    totalsByPeriod.set(vote.period_id, entry);
  }

  // Only simulated periods have anything to plot.
  const simulatedPeriods = [...periods]
    .filter((period) => (totalsByPeriod.get(period.id)?.total ?? 0) > 0)
    .sort((a, b) => a.voting_date.localeCompare(b.voting_date));

  const partiesWithVotes = parties.filter((party) =>
    [...totalsByPeriod.values()].some((entry) => (entry.byParty.get(party.id) ?? 0) > 0),
  );
  const effectiveSelectedIds = selectedPartyIds ?? partiesWithVotes.map((party) => String(party.id));
  const selectedParties = parties.filter((party) => effectiveSelectedIds.includes(String(party.id)));

  const periodIndex = (id: string | null) => simulatedPeriods.findIndex((period) => String(period.id) === id);
  const fromIndex = Math.max(periodIndex(fromPeriodId), 0);
  const toIndexRaw = periodIndex(toPeriodId);
  const toIndex = toIndexRaw === -1 ? simulatedPeriods.length - 1 : toIndexRaw;
  const visiblePeriods = simulatedPeriods.slice(fromIndex, toIndex + 1);

  const periodOptions = (disable: (index: number) => boolean) =>
    simulatedPeriods.map((period, index) => ({
      value: String(period.id),
      // "YYYY-MM-DD" — slicing avoids a Date/local-timezone round-trip.
      label: period.voting_date.slice(0, 4),
      disabled: disable(index),
    }));

  // A party that didn't receive votes in a period (not founded yet, dissolved, or
  // simply not running) gets no value there — a gap in its line, not a drop to 0.
  const chartData = visiblePeriods.map((period) => {
    const entry = totalsByPeriod.get(period.id)!;
    const row: Record<string, number | string | null> = { year: period.voting_date.slice(0, 4) };
    for (const party of selectedParties) {
      const partyVotes = entry.byParty.get(party.id);
      row[seriesKey(party.id)] = partyVotes ? Math.round((partyVotes / entry.total) * 1000) / 10 : null;
    }
    return row;
  });
  const chartSeries = selectedParties.map((party) => ({
    name: seriesKey(party.id),
    label: party.abbreviation,
    color: party.color_bg as MantineColor,
  }));

  return (
    <>
      <PageHeader title={t.partyResults.pageTitle} subtitle={t.partyResults.subtitle} />

      {periods.length === 0 ? (
        <Text c="dimmed">{t.partyResults.empty}</Text>
      ) : simulatedPeriods.length === 0 ? (
        <Text c="dimmed">{t.partyResults.noResultsYet}</Text>
      ) : (
        <>
          <Stack gap={4} mb="md">
            <Text size="sm" fw={500}>
              {t.partyResults.partySelectorLabel}
            </Text>
            <ChipScroller
              multiple
              options={parties.map((party) => ({
                value: String(party.id),
                label: party.abbreviation,
                color: party.color_bg,
              }))}
              value={effectiveSelectedIds}
              onChange={setSelectedPartyIds}
              ariaLabel={t.partyResults.partySelectorLabel}
            />
          </Stack>

          <Group align="flex-end" mb="md">
            <Select
              label={t.partyResults.fromLabel}
              data={periodOptions((index) => index > toIndex)}
              value={String(simulatedPeriods[fromIndex].id)}
              onChange={setFromPeriodId}
              allowDeselect={false}
              w={120}
            />
            <Select
              label={t.partyResults.toLabel}
              data={periodOptions((index) => index < fromIndex)}
              value={String(simulatedPeriods[toIndex].id)}
              onChange={setToPeriodId}
              allowDeselect={false}
              w={120}
            />
          </Group>

          {selectedParties.length === 0 ? (
            <Text c="dimmed">{t.partyResults.noPartySelected}</Text>
          ) : (
            <>
              <Text fw={600} mb="sm">
                {t.partyResults.chartTitle}
              </Text>
              <DiagramSurface mb="xl">
                <LineChart
                  h={360}
                  data={chartData}
                  dataKey="year"
                  series={chartSeries}
                  curveType="linear"
                  connectNulls={false}
                  withLegend={false}
                  yAxisProps={{ domain: [0, "auto"] }}
                  valueFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Group gap="md" mt="sm" justify="center">
                  {selectedParties.map((party) => (
                    <Group key={party.id} gap={6} wrap="nowrap">
                      <ColorSwatch color={party.color_bg} size={12} />
                      <Text size="sm" c={themeConfig.diagram.text}>
                        {party.abbreviation}
                      </Text>
                    </Group>
                  ))}
                </Group>
              </DiagramSurface>
            </>
          )}
        </>
      )}
    </>
  );
}
