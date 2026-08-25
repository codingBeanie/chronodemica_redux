import { Table, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import { parliamentPeriodsApi, partiesApi } from "../api/resources";
import type { ParliamentPeriod, Party } from "../api/types";
import { InGovernmentIcon } from "../components/InGovernmentIcon";
import { PageHeader } from "../components/PageHeader";
import { ParliamentHemicycle } from "../components/ParliamentHemicycle";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContext } from "../context/PeriodContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

type SortKey = "party" | "seats" | "in_government";

export function ParliamentPeriodsPage() {
  const t = useTranslation();
  const { selectedPeriodId } = usePeriodContext();
  const [entries, setEntries] = useState<ParliamentPeriod[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("seats", "desc");

  useEffect(() => {
    partiesApi.list().then(setParties);
  }, []);

  const refresh = () => {
    if (!selectedPeriodId) {
      setEntries([]);
      return;
    }
    parliamentPeriodsApi.list({ period_id: selectedPeriodId }).then(setEntries);
  };

  useEffect(refresh, [selectedPeriodId]);

  const partyName = (id: number) => parties.find((p) => p.id === id)?.name ?? "-";
  const partyColor = (id: number) => parties.find((p) => p.id === id)?.color_bg ?? "#adb5bd";
  const partySeatOrientation = (id: number) => parties.find((p) => p.id === id)?.seat_orientation ?? 50;

  const getSortValue = (entry: ParliamentPeriod, key: SortKey): string | number => {
    if (key === "party") return partyName(entry.party_id);
    if (key === "in_government") return entry.in_government ? 1 : 0;
    return entry.seats;
  };
  const sortedEntries = [...entries].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
  );

  return (
    <>
      <PageHeader title={t.parliamentPeriods.pageTitle} />

      <PeriodSelector />

      {selectedPeriodId && entries.length > 0 && (
        <ParliamentHemicycle
          parties={entries.map((entry) => ({
            id: entry.party_id,
            name: partyName(entry.party_id),
            color: partyColor(entry.party_id),
            seats: entry.seats,
            seatOrientation: partySeatOrientation(entry.party_id),
            inGovernment: entry.in_government,
          }))}
        />
      )}

      {selectedPeriodId && (
        <Table mt="xl">
          <Table.Thead>
            <Table.Tr>
              <SortableTh
                label={t.parliamentPeriods.columnParty}
                sortKey="party"
                activeKey={sortKey}
                direction={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label={t.parliamentPeriods.columnSeats}
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
            {sortedEntries.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>{partyName(entry.party_id)}</Table.Td>
                <Table.Td ta="right">{entry.seats}</Table.Td>
                <Table.Td>
                  <InGovernmentIcon inGovernment={entry.in_government} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {selectedPeriodId && entries.length === 0 && (
        <Text c="dimmed" mt="md">
          {t.parliamentPeriods.empty}
        </Text>
      )}
    </>
  );
}
