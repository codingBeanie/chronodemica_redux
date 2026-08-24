import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import { coalitionsApi, parliamentPeriodsApi, partiesApi } from "../api/resources";
import type { Coalition, CoalitionsResult, ParliamentPeriod, Party } from "../api/types";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";

function isSameCoalition(partyIds: number[], activePartyIds: number[]): boolean {
  if (partyIds.length !== activePartyIds.length) return false;
  const active = new Set(activePartyIds);
  return partyIds.every((id) => active.has(id));
}

export function CoalitionsPage() {
  const t = useTranslation();
  const { selectedPeriodId } = usePeriodContext();
  const [parties, setParties] = useState<Party[]>([]);
  const [entries, setEntries] = useState<ParliamentPeriod[]>([]);
  const [result, setResult] = useState<CoalitionsResult | null>(null);

  useEffect(() => {
    partiesApi.list().then(setParties);
  }, []);

  const refresh = () => {
    if (!selectedPeriodId) {
      setEntries([]);
      setResult(null);
      return;
    }
    parliamentPeriodsApi.list({ period_id: selectedPeriodId }).then(setEntries);
    coalitionsApi.get(selectedPeriodId).then(setResult);
  };

  useEffect(refresh, [selectedPeriodId]);

  const party = (id: number) => parties.find((p) => p.id === id);
  const partySeats = (id: number) => entries.find((e) => e.party_id === id)?.seats ?? 0;
  const activePartyIds = entries.filter((e) => e.in_government).map((e) => e.party_id);

  const handleActivate = async (coalition: Coalition) => {
    if (!window.confirm(t.coalitions.confirmActivate)) return;
    const partySet = new Set(coalition.party_ids);
    await Promise.all(
      entries.map((entry) => parliamentPeriodsApi.setInGovernment(entry.id, partySet.has(entry.party_id))),
    );
    refresh();
  };

  return (
    <>
      <Text size="xl" fw={700} mb="md">
        {t.coalitions.pageTitle}
      </Text>

      <PeriodSelector />

      {selectedPeriodId && (
        <>
          <Text c="dimmed" mb="md">
            {t.coalitions.subtitle}
          </Text>

          {(!result || result.coalitions.length === 0) && (
            <Text c="dimmed">{t.coalitions.empty}</Text>
          )}

          <Stack gap="sm">
            {result?.coalitions.map((coalition) => {
              const isActive = isSameCoalition(coalition.party_ids, activePartyIds);
              return (
                <Card key={coalition.party_ids.join("-")} withBorder padding="md">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      {[...coalition.party_ids]
                        .sort((a, b) => partySeats(b) - partySeats(a))
                        .map((partyId) => {
                          const p = party(partyId);
                          return (
                            <Badge
                              key={partyId}
                              color={p?.color_bg ?? "#adb5bd"}
                              style={{ color: p?.color_text }}
                            >
                              {p?.name ?? "-"} ({partySeats(partyId)})
                            </Badge>
                          );
                        })}
                    </Group>
                    <Group gap="md">
                      <Text size="sm" c="dimmed">
                        {t.coalitions.seatsLabel(coalition.total_seats, result.majority_threshold)}
                      </Text>
                      {isActive ? (
                        <Badge color="green">{t.coalitions.activeLabel}</Badge>
                      ) : (
                        <Button size="xs" onClick={() => handleActivate(coalition)}>
                          {t.coalitions.activateButton}
                        </Button>
                      )}
                    </Group>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        </>
      )}
    </>
  );
}
