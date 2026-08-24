import { Table, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import { parliamentPeriodsApi, partiesApi } from "../api/resources";
import type { ParliamentPeriod, Party } from "../api/types";
import { InGovernmentIcon } from "../components/InGovernmentIcon";
import { ParliamentHemicycle } from "../components/ParliamentHemicycle";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";

export function ParliamentPeriodsPage() {
  const t = useTranslation();
  const { selectedPeriodId } = usePeriodContext();
  const [entries, setEntries] = useState<ParliamentPeriod[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

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

  return (
    <>
      <Text size="xl" fw={700} mb="md">
        {t.parliamentPeriods.pageTitle}
      </Text>

      <PeriodSelector />

      {selectedPeriodId && entries.length > 0 && (
        <ParliamentHemicycle
          parties={entries.map((entry) => ({
            id: entry.party_id,
            name: partyName(entry.party_id),
            color: partyColor(entry.party_id),
            seats: entry.seats,
            seatOrientation: partySeatOrientation(entry.party_id),
          }))}
        />
      )}

      {selectedPeriodId && (
        <Table striped highlightOnHover mt="xl">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t.parliamentPeriods.columnParty}</Table.Th>
              <Table.Th ta="right">{t.parliamentPeriods.columnSeats}</Table.Th>
              <Table.Th>{t.parliamentPeriods.columnInGovernment}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((entry) => (
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
