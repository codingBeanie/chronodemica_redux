import { Stack, Text } from "@mantine/core";

import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";
import { ChipScroller } from "./ChipScroller";

export function PeriodSelector() {
  const t = useTranslation();
  const { periods, selectedPeriodId, setSelectedPeriodId } = usePeriodContext();

  if (periods.length === 0) {
    return (
      <Text c="dimmed" mb="md">
        {t.periodSelector.none}
      </Text>
    );
  }

  const sortedPeriods = [...periods].sort((a, b) => a.voting_date.localeCompare(b.voting_date));
  const options = sortedPeriods.map((period) => ({
    value: String(period.id),
    // "YYYY-MM-DD" (from a native date input) — slicing avoids a Date/local-timezone
    // round-trip that can roll a January date back into the previous year.
    label: period.voting_date.slice(0, 4),
  }));
  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) ?? null;

  return (
    <Stack gap={4} mb="md">
      <Text size="sm" fw={500}>
        {t.periodSelector.label}
      </Text>
      <ChipScroller
        options={options}
        value={selectedPeriodId !== null ? String(selectedPeriodId) : null}
        onChange={(value) => setSelectedPeriodId(Number(value))}
        ariaLabel={t.periodSelector.label}
      />
      {selectedPeriod && (
        <Text size="xs" c="dimmed">
          {selectedPeriod.voting_date}
        </Text>
      )}
    </Stack>
  );
}
