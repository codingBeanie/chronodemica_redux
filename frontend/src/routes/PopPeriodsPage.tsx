import { AreaChart } from "@mantine/charts";
import { Button, ColorSwatch, Group, NumberInput, Table, Text } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useState } from "react";

import { periodsApi, popPeriodsApi, popsApi } from "../api/resources";
import type { Pop, PopPeriod } from "../api/types";
import { DiagramSurface } from "../components/DiagramSurface";
import { PageHeader } from "../components/PageHeader";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContext } from "../context/PeriodContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { annualGrowthPercent, formatGrowthPercent, yearsBetween } from "../utils/growth";
import { useTranslation } from "../i18n/I18nProvider";
import { themeConfig } from "../theme.config";

// Population growth uses a fixed brand-ish color; the composition chart colors
// each series by its own pop's color_bg — pop colors are domain data the user
// picks (like Party.color_bg), not a generated categorical palette.
const POPULATION_LINE_COLOR = "#2a78d6" as MantineColor;

type SortKey = "name" | "share" | "turnout" | "population" | "votesCast";

export function PopPeriodsPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId, refresh: refreshPeriods } = usePeriodContext();
  const [pops, setPops] = useState<Pop[]>([]);
  const [items, setItems] = useState<PopPeriod[]>([]);
  const [allPopPeriods, setAllPopPeriods] = useState<PopPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareDrafts, setShareDrafts] = useState<Record<number, number>>({});
  const [turnoutDrafts, setTurnoutDrafts] = useState<Record<number, number>>({});
  const [totalPopulationDraft, setTotalPopulationDraft] = useState(0);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("name");

  useEffect(() => {
    popsApi.list().then((list) => setPops([...list].sort((a, b) => a.id - b.id)));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [currentItems, everyPopPeriod] = await Promise.all([
        selectedPeriodId ? popPeriodsApi.list({ period_id: selectedPeriodId }) : Promise.resolve([]),
        popPeriodsApi.list(),
      ]);
      setItems(currentItems);
      setAllPopPeriods(everyPopPeriod);
      setShareDrafts(Object.fromEntries(currentItems.map((item) => [item.pop_id, item.share])));
      setTurnoutDrafts(Object.fromEntries(currentItems.map((item) => [item.pop_id, item.turnout])));
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sortedPeriods = [...periods].sort((a, b) => a.voting_date.localeCompare(b.voting_date));
  const currentPeriod = periods.find((p) => p.id === selectedPeriodId);
  const currentIndex = sortedPeriods.findIndex((p) => p.id === selectedPeriodId);
  const previousPeriod = currentIndex > 0 ? sortedPeriods[currentIndex - 1] : null;

  useEffect(() => {
    setTotalPopulationDraft(currentPeriod?.total_population ?? 0);
  }, [currentPeriod?.id, currentPeriod?.total_population]);
  const previousItems = previousPeriod
    ? allPopPeriods.filter((pp) => pp.period_id === previousPeriod.id)
    : [];

  const years =
    previousPeriod && currentPeriod ? yearsBetween(previousPeriod.voting_date, currentPeriod.voting_date) : null;
  const growthRate =
    previousPeriod && currentPeriod && years !== null
      ? annualGrowthPercent(previousPeriod.total_population, currentPeriod.total_population, years)
      : null;

  const shareSum = pops.reduce((sum, pop) => sum + (shareDrafts[pop.id] ?? 0), 0);

  const handleCopyFromPrevious = () => {
    if (previousItems.length === 0) return;
    setShareDrafts((prev) => {
      const next = { ...prev };
      for (const item of previousItems) next[item.pop_id] = item.share;
      return next;
    });
    setTurnoutDrafts((prev) => {
      const next = { ...prev };
      for (const item of previousItems) next[item.pop_id] = item.turnout;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        items
          .filter(
            (item) =>
              (shareDrafts[item.pop_id] ?? item.share) !== item.share ||
              (turnoutDrafts[item.pop_id] ?? item.turnout) !== item.turnout,
          )
          .map((item) =>
            popPeriodsApi.update(item.id, {
              share: shareDrafts[item.pop_id] ?? item.share,
              turnout: turnoutDrafts[item.pop_id] ?? item.turnout,
            }),
          ),
      );
      if (currentPeriod && totalPopulationDraft !== currentPeriod.total_population) {
        await periodsApi.update(currentPeriod.id, { total_population: totalPopulationDraft });
      }
      await Promise.all([refresh(), refreshPeriods()]);
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const headcount = (share: number) => Math.round((totalPopulationDraft * share) / 100);
  const votesCast = (share: number, turnout: number) => Math.round(headcount(share) * turnout);

  const getSortValue = (pop: Pop, key: SortKey): string | number => {
    const share = shareDrafts[pop.id] ?? 0;
    const turnout = turnoutDrafts[pop.id] ?? 0;
    switch (key) {
      case "name":
        return pop.name;
      case "share":
        return share;
      case "turnout":
        return turnout;
      case "population":
        return headcount(share);
      case "votesCast":
        return votesCast(share, turnout);
    }
  };
  const sortedPops = [...pops].sort((a, b) => compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir));

  // --- Charts: population growth (all periods), and composition over time
  // (one series per pop group, colored by that pop's own color_bg — same
  // domain-color-as-chart-color pattern already used for Party). ---
  const populationData = sortedPeriods.map((period) => ({
    year: period.voting_date.slice(0, 4),
    population: period.total_population,
  }));

  const compositionData = sortedPeriods.map((period) => {
    const row: Record<string, number | string> = { year: period.voting_date.slice(0, 4) };
    for (const pop of pops) {
      const pp = allPopPeriods.find((x) => x.period_id === period.id && x.pop_id === pop.id);
      row[pop.name] = pp?.share ?? 0;
    }
    return row;
  });
  const compositionSeries = pops.map((pop) => ({ name: pop.name, color: pop.color_bg as MantineColor }));

  return (
    <>
      <PageHeader title={t.popPeriods.pageTitle} />

      <PeriodSelector />

      {selectedPeriodId && (
        <>
          <Text fw={600}>{t.popPeriods.totalPopulationTitle}</Text>
          <NumberInput
            value={totalPopulationDraft}
            onChange={(value) => setTotalPopulationDraft(typeof value === "number" ? value : 0)}
            min={0}
            w={200}
            thousandSeparator=","
            mb={4}
          />
          <Text size="sm" c="dimmed" mb="md">
            {previousPeriod
              ? `${t.popPeriods.vsPreviousPeriod} (${previousPeriod.voting_date}): ${previousPeriod.total_population.toLocaleString()} · ${formatGrowthPercent(growthRate)}`
              : t.popPeriods.noPreviousPeriod}
          </Text>

          <Group gap="sm" mb="md">
            <Button
              variant="default"
              onClick={handleCopyFromPrevious}
              disabled={previousItems.length === 0}
            >
              {t.popPeriods.copyPreviousButton}
            </Button>
          </Group>

          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <SortableTh
                    label={t.popPeriods.columnPop}
                    sortKey="name"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label={t.popPeriods.columnShare}
                    sortKey="share"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                    align="right"
                  />
                  <SortableTh
                    label={t.popPeriods.columnTurnout}
                    sortKey="turnout"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                    align="right"
                  />
                  <SortableTh
                    label={t.popPeriods.columnPopulation}
                    sortKey="population"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                    align="right"
                  />
                  <SortableTh
                    label={t.popPeriods.columnVotesCast}
                    sortKey="votesCast"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                    align="right"
                  />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedPops.map((pop) => {
                  const share = shareDrafts[pop.id] ?? 0;
                  const turnout = turnoutDrafts[pop.id] ?? 0;
                  return (
                    <Table.Tr key={pop.id}>
                      <Table.Td>{pop.name}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={share}
                          onChange={(value) =>
                            setShareDrafts((prev) => ({ ...prev, [pop.id]: typeof value === "number" ? value : 0 }))
                          }
                          min={0}
                          max={100}
                          w={100}
                          ml="auto"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={turnout}
                          onChange={(value) =>
                            setTurnoutDrafts((prev) => ({
                              ...prev,
                              [pop.id]: typeof value === "number" ? value : 0,
                            }))
                          }
                          min={0}
                          max={1}
                          step={0.01}
                          decimalScale={2}
                          w={100}
                          ml="auto"
                        />
                      </Table.Td>
                      <Table.Td ta="right">{headcount(share).toLocaleString()}</Table.Td>
                      <Table.Td ta="right">{votesCast(share, turnout).toLocaleString()}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
              <Table.Tfoot>
                <Table.Tr>
                  <Table.Th>{t.popPeriods.sumLabel}</Table.Th>
                  <Table.Th ta="right" c={shareSum === 100 ? "green.9" : "orange.9"} fw={600}>
                    {shareSum}%
                  </Table.Th>
                  <Table.Th />
                  <Table.Th />
                  <Table.Th />
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>

          <Button onClick={handleSave} loading={saving || loading} mt="md">
            {t.common.save}
          </Button>
        </>
      )}

      {periods.length > 0 && (
        <>
          <Text fw={600} mt="xl" mb="sm">
            {t.popPeriods.populationGrowthChartTitle}
          </Text>
          <DiagramSurface mb="xl">
            <AreaChart
              h={220}
              data={populationData}
              dataKey="year"
              series={[{ name: "population", color: POPULATION_LINE_COLOR }]}
              withLegend={false}
              curveType="linear"
              valueFormatter={(value) => value.toLocaleString()}
            />
          </DiagramSurface>

          <Text fw={600} mb="sm">
            {t.popPeriods.compositionChartTitle}
          </Text>
          <DiagramSurface mb="xl">
            <AreaChart
              h={280}
              data={compositionData}
              dataKey="year"
              series={compositionSeries}
              type="percent"
              withLegend={false}
              curveType="linear"
              valueFormatter={(value) => `${value}%`}
            />
            <Group gap="md" mt="sm" justify="center">
              {pops.map((pop) => (
                <Group key={pop.id} gap={6} wrap="nowrap">
                  <ColorSwatch color={pop.color_bg} size={12} />
                  <Text size="sm" c={themeConfig.diagram.text}>
                    {pop.name}
                  </Text>
                </Group>
              ))}
            </Group>
          </DiagramSurface>
        </>
      )}
    </>
  );
}
