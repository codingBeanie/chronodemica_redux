import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import { coalitionsApi, parliamentPeriodsApi, partiesApi } from "../api/resources";
import type { Coalition, CoalitionsResult, ParliamentPeriod, Party } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { PeriodSelector } from "../components/PeriodSelector";
import { SegmentedBar } from "../components/SegmentedBar";
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

  const handleActivate = (coalition: Coalition) => {
    confirmDialog({
      tier: "neutral",
      title: t.coalitions.activateButton,
      message: t.coalitions.confirmActivate,
      confirmLabel: t.coalitions.activateButton,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
        const partySet = new Set(coalition.party_ids);
        await Promise.all(
          entries.map((entry) => parliamentPeriodsApi.setInGovernment(entry.id, partySet.has(entry.party_id))),
        );
        refresh();
      },
    });
  };

  return (
    <>
      <PageHeader title={t.coalitions.pageTitle} subtitle={t.coalitions.subtitle} />

      <PeriodSelector />

      {selectedPeriodId && (
        <>
          {result && (
            <Text fw={600} mb="md">
              {t.coalitions.headerStat(result.total_seats, result.majority_threshold)}
            </Text>
          )}

          {(!result || result.coalitions.length === 0) && <Text c="dimmed">{t.coalitions.empty}</Text>}

          {result && result.coalitions.length > 0 && (
            <>
              <div style={{ position: "relative" }}>
                <Text
                  size="sm"
                  c="dimmed"
                  style={{
                    position: "absolute",
                    left: `${(result.majority_threshold / result.total_seats) * 100}%`,
                    transform: "translateX(-50%)",
                    top: 0,
                  }}
                >
                  {t.coalitions.thresholdMarkerLabel(result.majority_threshold)}
                </Text>

                <Stack gap="sm" mt={28}>
                  {result.coalitions.map((coalition) => {
                    const isActive = isSameCoalition(coalition.party_ids, activePartyIds);
                    const sortedPartyIds = [...coalition.party_ids].sort((a, b) => partySeats(b) - partySeats(a));
                    return (
                      <Group key={coalition.party_ids.join("-")} wrap="nowrap" gap="sm">
                        <div style={{ flex: 1 }}>
                          <SegmentedBar
                            orientation="horizontal"
                            thickness={36}
                            total={result.total_seats}
                            threshold={{ value: result.majority_threshold }}
                            segments={sortedPartyIds.map((partyId) => {
                              const p = party(partyId);
                              return {
                                key: partyId,
                                value: partySeats(partyId),
                                color: p?.color_bg ?? "#adb5bd",
                                textColor: p?.color_text,
                                label: `${p?.abbreviation ?? "-"} ${partySeats(partyId)}`,
                              };
                            })}
                          />
                        </div>
                        <Text fw={700} w={40} flex="0 0 auto">
                          {coalition.total_seats}
                        </Text>
                        {/* Fixed-size slot regardless of state, on BOTH axes — the bar to its
                            left is flex:1 and absorbs whatever width this slot doesn't use, so
                            if this slot's actual rendered width varies (e.g. a `minWidth` that
                            a wider Badge grows past), the bar shrinks in that one row only,
                            desyncing its pixels-per-seat scale from every other row's bar and
                            throwing off the shared threshold line's alignment. `width` (not
                            `minWidth`) + `flexShrink: 0` guarantees this slot is pixel-identical
                            across every row regardless of which state it's in. */}
                        <div style={{ height: 36, width: 190, flexShrink: 0, display: "flex", alignItems: "center" }}>
                          {isActive ? (
                            <Badge color="green" size="lg" style={{ whiteSpace: "nowrap" }}>
                              {t.coalitions.activeLabel}
                            </Badge>
                          ) : (
                            <Button size="sm" onClick={() => handleActivate(coalition)}>
                              {t.coalitions.activateButton}
                            </Button>
                          )}
                        </div>
                      </Group>
                    );
                  })}
                </Stack>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
