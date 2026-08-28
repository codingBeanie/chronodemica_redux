import { Button, Group, NumberInput, Table } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useState } from "react";

import { partiesApi, partyPeriodsApi } from "../api/resources";
import type { Party, PartyPeriod } from "../api/types";
import { PageHeader } from "../components/PageHeader";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";
import { isPartyActiveAt } from "../utils/partyDisplay";

export function PartyPeriodsPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId } = usePeriodContext();
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<PartyPeriod[]>([]);
  const [previousItems, setPreviousItems] = useState<PartyPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [popularityDrafts, setPopularityDrafts] = useState<Record<number, number>>({});

  useEffect(() => {
    partiesApi.list().then(setParties);
  }, []);

  const refresh = useCallback(async () => {
    if (!selectedPeriodId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const currentItems = await partyPeriodsApi.list({ period_id: selectedPeriodId });
      setItems(currentItems);
      setPopularityDrafts(Object.fromEntries(currentItems.map((item) => [item.party_id, item.popularity])));
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sortedPeriods = [...periods].sort((a, b) => a.voting_date.localeCompare(b.voting_date));
  const currentPeriod = periods.find((p) => p.id === selectedPeriodId) ?? null;
  const currentIndex = sortedPeriods.findIndex((p) => p.id === selectedPeriodId);
  const previousPeriod = currentIndex > 0 ? sortedPeriods[currentIndex - 1] : null;

  useEffect(() => {
    if (previousPeriod) {
      partyPeriodsApi.list({ period_id: previousPeriod.id }).then(setPreviousItems);
    } else {
      setPreviousItems([]);
    }
  }, [previousPeriod]);

  // Every founded-and-not-yet-dissolved party already has a PartyPeriod row for
  // this period (auto-created alongside the party/period itself) — this page
  // only maintains Popularity, never adds or removes rows.
  const eligibleParties = currentPeriod
    ? parties.filter((party) => isPartyActiveAt(party, currentPeriod.voting_date))
    : [];

  const handleCopyFromPrevious = () => {
    if (previousItems.length === 0) return;
    setPopularityDrafts((prev) => {
      const next = { ...prev };
      for (const item of previousItems) next[item.party_id] = item.popularity;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        items
          .filter((item) => (popularityDrafts[item.party_id] ?? item.popularity) !== item.popularity)
          .map((item) =>
            partyPeriodsApi.update(item.id, { popularity: popularityDrafts[item.party_id] ?? item.popularity }),
          ),
      );
      await refresh();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={t.partyPeriods.pageTitle} />

      <PeriodSelector />

      {selectedPeriodId && (
        <>
          <Group gap="sm" mb="md">
            <Button
              variant="default"
              onClick={handleCopyFromPrevious}
              disabled={previousItems.length === 0}
            >
              {t.partyPeriods.copyPreviousButton}
            </Button>
          </Group>

          <Table.ScrollContainer minWidth={480}>
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t.partyPeriods.columnParty}</Table.Th>
                  <Table.Th ta="right">{t.partyPeriods.columnPopularity}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {eligibleParties.map((party) => {
                  const item = items.find((x) => x.party_id === party.id);
                  if (!item) return null;
                  const popularity = popularityDrafts[party.id] ?? item.popularity;
                  return (
                    <Table.Tr key={party.id}>
                      <Table.Td>{party.name}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={popularity}
                          onChange={(value) =>
                            setPopularityDrafts((prev) => ({
                              ...prev,
                              [party.id]: typeof value === "number" ? value : 1,
                            }))
                          }
                          min={1}
                          max={20}
                          w={100}
                          ml="auto"
                        />
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Button onClick={handleSave} loading={saving || loading} mt="md">
            {t.common.save}
          </Button>
        </>
      )}
    </>
  );
}
