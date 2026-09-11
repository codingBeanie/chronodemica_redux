import { Badge, Button, Chip, Divider, Group, Stack, Text } from "@mantine/core";
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
  const [customSelection, setCustomSelection] = useState<Set<number>>(new Set());

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
  // The virtual "Misc" entry (party_id null) never joins a coalition — compute_coalitions
  // already excludes it from every coalition's party_ids, so it's filtered out here too.
  const activePartyIds = entries
    .filter((e) => e.in_government)
    .map((e) => e.party_id)
    .filter((id): id is number => id !== null);
  const governmentSeats = activePartyIds.reduce((sum, id) => sum + partySeats(id), 0);
  const isMinorityGovernment =
    result !== null && activePartyIds.length > 0 && governmentSeats < result.majority_threshold;

  // Reset the builder to reflect reality whenever the period changes — but not on every
  // background refresh, so it doesn't clobber an in-progress selection the user is
  // still assembling after e.g. the "Deactivate" button triggers a refetch.
  useEffect(() => {
    setCustomSelection(new Set(activePartyIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodId]);

  const parliamentPartyIds = entries
    .filter((e): e is ParliamentPeriod & { party_id: number } => e.party_id !== null && e.seats > 0)
    .map((e) => e.party_id);
  const customSeats = [...customSelection].reduce((sum, id) => sum + partySeats(id), 0);
  const customIsMajority = result !== null && customSeats >= result.majority_threshold;

  const toggleCustomParty = (id: number) => {
    setCustomSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyGovernment = async (partyIds: number[]) => {
    const partySet = new Set(partyIds);
    await Promise.all(
      entries.map((entry) =>
        parliamentPeriodsApi.setInGovernment(entry.id, entry.party_id !== null && partySet.has(entry.party_id)),
      ),
    );
    refresh();
  };

  const handleActivate = (coalition: Coalition) => {
    confirmDialog({
      tier: "neutral",
      title: t.coalitions.activateButton,
      message: t.coalitions.confirmActivate,
      confirmLabel: t.coalitions.activateButton,
      cancelLabel: t.common.cancel,
      onConfirm: () => applyGovernment(coalition.party_ids),
    });
  };

  const handleDeactivate = () => {
    confirmDialog({
      tier: "neutral",
      title: t.coalitions.deactivateButton,
      message: t.coalitions.confirmDeactivate,
      confirmLabel: t.coalitions.deactivateButton,
      cancelLabel: t.common.cancel,
      onConfirm: () => applyGovernment([]),
    });
  };

  const handleConfirmCustom = () => {
    confirmDialog({
      tier: "neutral",
      title: t.coalitions.customConfirmButton,
      message: customIsMajority ? t.coalitions.confirmCustomActivate : t.coalitions.confirmCustomActivateMinority,
      confirmLabel: t.coalitions.customConfirmButton,
      cancelLabel: t.common.cancel,
      onConfirm: () => applyGovernment([...customSelection]),
    });
  };

  const hasParliament = result !== null && result.total_seats > 0;

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

          {!hasParliament && <Text c="dimmed">{t.coalitions.empty}</Text>}

          {hasParliament && (
            <Stack gap={4} mb="xl">
              <Text fw={600}>{t.coalitions.currentGovernmentTitle}</Text>
              {activePartyIds.length === 0 ? (
                <Text c="dimmed" size="sm">
                  {t.coalitions.noActiveGovernment}
                </Text>
              ) : (
                <Group gap="xs" align="center">
                  {[...activePartyIds]
                    .sort((a, b) => partySeats(b) - partySeats(a))
                    .map((id) => {
                      const p = party(id);
                      return (
                        <Badge
                          key={id}
                          size="lg"
                          radius="sm"
                          color={p?.color_bg ?? "gray"}
                          style={{ color: p?.color_text }}
                        >
                          {p?.abbreviation ?? "-"} · {partySeats(id)}
                        </Badge>
                      );
                    })}
                  {isMinorityGovernment && (
                    <Badge size="lg" radius="sm" color="yellow" variant="light">
                      {t.coalitions.minorityBadge}
                    </Badge>
                  )}
                  <Button size="xs" color="red" variant="subtle" onClick={handleDeactivate}>
                    {t.coalitions.deactivateButton}
                  </Button>
                </Group>
              )}
            </Stack>
          )}

          {hasParliament && result!.coalitions.length === 0 && (
            <Text c="dimmed" mb="xl">
              {t.coalitions.noMinimalCoalitions}
            </Text>
          )}

          {hasParliament && result!.coalitions.length > 0 && (
            <Stack gap="sm" mt={28} mb="xl">
              {result!.coalitions.map((coalition, index) => {
                const isActive = isSameCoalition(coalition.party_ids, activePartyIds);
                const sortedPartyIds = [...coalition.party_ids].sort((a, b) => partySeats(b) - partySeats(a));

                // Position relative to the bar's OWN rendered width, not the row's — the row
                // also contains fixed-width siblings (seat total, action button), so a % based
                // on the whole row would land at the wrong spot inside the (narrower) bar.
                // Rendered once, above the first coalition's bar only.
                const bar = (
                  <div style={{ position: "relative", width: "100%" }}>
                    {index === 0 && (
                      <Text
                        size="sm"
                        c="dimmed"
                        style={{
                          position: "absolute",
                          left: `${(result!.majority_threshold / result!.total_seats) * 100}%`,
                          transform: "translateX(-50%)",
                          top: -24,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.coalitions.thresholdMarkerLabel(result!.majority_threshold)}
                      </Text>
                    )}
                    <SegmentedBar
                      orientation="horizontal"
                      thickness={36}
                      total={result!.total_seats}
                      threshold={{ value: result!.majority_threshold }}
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
                );

                const action = isActive ? (
                  <Badge color="green" size="lg" style={{ whiteSpace: "nowrap" }}>
                    {t.coalitions.activeLabel}
                  </Badge>
                ) : (
                  <Button size="sm" onClick={() => handleActivate(coalition)}>
                    {t.coalitions.activateButton}
                  </Button>
                );

                return (
                  <div key={coalition.party_ids.join("-")}>
                    {/* Desktop/tablet: bar, seat total, and action all share one row — each
                        given a fixed-width slot (see the width/flexShrink note) so the bar's
                        rendered width, and therefore its threshold line, is identical across
                        every coalition regardless of which action state that row is in. */}
                    <Group wrap="nowrap" gap="sm" visibleFrom="sm">
                      <div style={{ flex: 1 }}>{bar}</div>
                      <Text fw={700} w={40} flex="0 0 auto">
                        {coalition.total_seats}
                      </Text>
                      <div
                        style={{ height: 36, width: 190, flexShrink: 0, display: "flex", alignItems: "center" }}
                      >
                        {action}
                      </div>
                    </Group>

                    {/* Mobile: the bar needs the full row width to stay legible (segment
                        labels), so a fixed-width trailing slot isn't viable here — stack the
                        seat total + action below it instead of squeezing them beside it. */}
                    <Stack gap={4} hiddenFrom="sm">
                      {bar}
                      <Group justify="space-between" wrap="nowrap">
                        <Text fw={700}>{coalition.total_seats}</Text>
                        {action}
                      </Group>
                    </Stack>
                  </div>
                );
              })}
            </Stack>
          )}

          {hasParliament && (
            <>
              <Divider my="xl" />
              <Text fw={600} mb={4}>
                {t.coalitions.customTitle}
              </Text>
              <Text size="sm" c="dimmed" mb="sm">
                {t.coalitions.customHint}
              </Text>
              <Group gap="xs" mb="sm">
                {parliamentPartyIds.map((id) => {
                  const p = party(id);
                  return (
                    <Chip key={id} checked={customSelection.has(id)} onChange={() => toggleCustomParty(id)}>
                      {p?.abbreviation ?? "-"} ({partySeats(id)})
                    </Chip>
                  );
                })}
              </Group>
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm">
                  {t.coalitions.customSeatsLabel(customSeats, result!.total_seats)} —{" "}
                  {customIsMajority ? t.coalitions.majorityBadge : t.coalitions.minorityBadge}
                </Text>
                <Button onClick={handleConfirmCustom}>{t.coalitions.customConfirmButton}</Button>
              </Group>
            </>
          )}
        </>
      )}
    </>
  );
}
