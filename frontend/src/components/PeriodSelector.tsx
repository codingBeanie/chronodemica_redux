import { Select, Text } from "@mantine/core";

import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";

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

  const options = periods.map((period) => ({
    value: String(period.id),
    label: period.voting_date,
  }));

  return (
    <Select
      label={t.periodSelector.label}
      placeholder={t.periodSelector.placeholder}
      data={options}
      value={selectedPeriodId ? String(selectedPeriodId) : null}
      onChange={(value) => setSelectedPeriodId(value ? Number(value) : null)}
      maw={360}
      mb="md"
    />
  );
}
