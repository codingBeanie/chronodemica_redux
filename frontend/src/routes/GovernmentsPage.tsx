import { Badge, Divider, Group, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import { parliamentPeriodsApi, partiesApi } from "../api/resources";
import type { ParliamentPeriod, Party } from "../api/types";
import { PageHeader } from "../components/PageHeader";
import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";

export function GovernmentsPage() {
  const t = useTranslation();
  const { periods } = usePeriodContext();
  const [parties, setParties] = useState<Party[]>([]);
  const [entries, setEntries] = useState<ParliamentPeriod[]>([]);

  useEffect(() => {
    partiesApi.list().then(setParties);
    // Unfiltered: every period's parliament composition at once, for a single
    // history-spanning list — unlike every other page, this one isn't scoped to
    // a single selected period.
    parliamentPeriodsApi.list().then(setEntries);
  }, []);

  const party = (id: number) => parties.find((p) => p.id === id);
  const sortedPeriods = [...periods].sort((a, b) => a.voting_date.localeCompare(b.voting_date));

  return (
    <>
      <PageHeader title={t.governments.pageTitle} subtitle={t.governments.subtitle} />

      {sortedPeriods.length === 0 ? (
        <Text c="dimmed">{t.governments.empty}</Text>
      ) : (
        <Stack gap="md">
          {sortedPeriods.map((period, index) => {
            // The virtual "Misc" bucket (party_id null) never governs — same
            // exclusion as the Coalitions page.
            const government = entries
              .filter((entry) => entry.period_id === period.id && entry.in_government && entry.party_id !== null)
              .sort((a, b) => b.seats - a.seats);
            const hasAnyResults = entries.some((entry) => entry.period_id === period.id);

            return (
              <div key={period.id}>
                {index > 0 && <Divider mb="md" />}
                <Group align="center" wrap="nowrap" gap="lg">
                  <Text fw={700} size="lg" style={{ flexShrink: 0, width: 64 }}>
                    {period.voting_date.slice(0, 4)}
                  </Text>
                  {government.length > 0 ? (
                    <Group gap="xs" wrap="wrap">
                      {government.map((entry) => {
                        const p = party(entry.party_id!);
                        return (
                          <Badge
                            key={entry.id}
                            size="lg"
                            radius="sm"
                            color={p?.color_bg ?? "gray"}
                            style={{ color: p?.color_text }}
                          >
                            {p?.abbreviation ?? "-"} · {entry.seats}
                          </Badge>
                        );
                      })}
                    </Group>
                  ) : (
                    <Text c="dimmed" size="sm">
                      {hasAnyResults ? t.governments.noGovernment : t.governments.noResultsYet}
                    </Text>
                  )}
                </Group>
              </div>
            );
          })}
        </Stack>
      )}
    </>
  );
}
