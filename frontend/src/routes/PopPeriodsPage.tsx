import { Button, Group, Modal, NumberInput, Select, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import { popPeriodsApi, popsApi } from "../api/resources";
import type { Pop, PopPeriod, PopPeriodInput } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodContext } from "../context/PeriodContext";
import { useCrud } from "../hooks/useCrud";
import { annualGrowthPercent, formatGrowthPercent, yearsBetween } from "../utils/growth";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PopPeriodInput = { pop_id: 0, period_id: 0, population: 0, turnout: 0.5, eligibility: 0.8 };

type SortKey = "pop" | "population" | "turnout" | "eligibility";

export function PopPeriodsPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId } = usePeriodContext();
  const { items, loading, error, create, update, remove, refresh } = useCrud(popPeriodsApi, {
    period_id: selectedPeriodId ?? 0,
  });
  const [pops, setPops] = useState<Pop[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<PopPeriod | null>(null);
  const [previousItems, setPreviousItems] = useState<PopPeriod[]>([]);
  const form = useForm<PopPeriodInput>({ initialValues: emptyValues });

  useEffect(() => {
    popsApi.list().then(setPops);
  }, []);

  const sortedPeriods = [...periods].sort((a, b) => a.voting_date.localeCompare(b.voting_date));
  const currentPeriod = periods.find((p) => p.id === selectedPeriodId);
  const currentIndex = sortedPeriods.findIndex((p) => p.id === selectedPeriodId);
  const previousPeriod = currentIndex > 0 ? sortedPeriods[currentIndex - 1] : null;

  useEffect(() => {
    if (previousPeriod) {
      popPeriodsApi.list({ period_id: previousPeriod.id }).then(setPreviousItems);
    } else {
      setPreviousItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousPeriod?.id]);

  const popName = (id: number) => pops.find((p) => p.id === id)?.name ?? "-";
  const popOptions = pops.map((p) => ({ value: String(p.id), label: p.name }));
  const previousPopulationFor = (popId: number) =>
    previousItems.find((p) => p.pop_id === popId)?.population ?? null;

  const years = previousPeriod && currentPeriod ? yearsBetween(previousPeriod.voting_date, currentPeriod.voting_date) : null;

  const currentTotal = items.reduce((sum, item) => sum + item.population, 0);
  const previousTotal = previousItems.reduce((sum, item) => sum + item.population, 0);
  const totalGrowthRate = years !== null ? annualGrowthPercent(previousTotal, currentTotal, years) : null;

  const adoptablePops = previousItems.filter(
    (prevItem) => !items.some((item) => item.pop_id === prevItem.pop_id),
  );

  const handleAdoptAll = async () => {
    if (!selectedPeriodId || adoptablePops.length === 0) return;
    await Promise.all(
      adoptablePops.map((prevItem) =>
        popPeriodsApi.create({
          pop_id: prevItem.pop_id,
          period_id: selectedPeriodId,
          population: prevItem.population,
          turnout: prevItem.turnout,
          eligibility: prevItem.eligibility,
        }),
      ),
    );
    await refresh();
  };

  const openCreate = () => {
    setEditing(null);
    form.setValues({ ...emptyValues, period_id: selectedPeriodId ?? 0 });
    open();
  };

  const openEdit = (entry: PopPeriod) => {
    setEditing(entry);
    form.setValues({
      pop_id: entry.pop_id,
      period_id: entry.period_id,
      population: entry.population,
      turnout: entry.turnout,
      eligibility: entry.eligibility,
    });
    open();
  };

  const handleSubmit = async (values: PopPeriodInput) => {
    try {
      if (editing) {
        await update(editing.id, values);
      } else {
        await create(values);
      }
      close();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    }
  };

  const handleDelete = (entry: PopPeriod) => {
    confirmDialog({
      tier: "routine",
      title: t.common.delete,
      message: t.popPeriods.confirmDelete,
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: () => remove(entry.id),
    });
  };

  const formPreviousPopulation = previousPopulationFor(form.values.pop_id);
  const formGrowthRate =
    formPreviousPopulation !== null && years !== null
      ? annualGrowthPercent(formPreviousPopulation, form.values.population, years)
      : null;

  const columns: DataTableColumn<PopPeriod, SortKey | "actions">[] = [
    { key: "pop", label: t.popPeriods.columnPop, render: (entry) => popName(entry.pop_id) },
    {
      key: "population",
      label: t.popPeriods.columnPopulation,
      render: (entry) => entry.population.toLocaleString(),
    },
    { key: "turnout", label: t.popPeriods.columnTurnout, render: (entry) => entry.turnout },
    { key: "eligibility", label: t.popPeriods.columnEligibility, render: (entry) => entry.eligibility },
    {
      key: "actions",
      label: null,
      sortable: false,
      render: (entry) => (
        <Button
          variant="subtle"
          color="red"
          size="xs"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete(entry);
          }}
        >
          {t.common.delete}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.popPeriods.pageTitle} />

      <PeriodSelector />

      <Group gap="sm" mb="md">
        <Button onClick={openCreate} disabled={!selectedPeriodId || pops.length === 0}>
          {t.popPeriods.newButton}
        </Button>
        <Button variant="default" onClick={handleAdoptAll} disabled={adoptablePops.length === 0}>
          {t.popPeriods.adoptAllButton}
        </Button>
      </Group>

      {selectedPeriodId && (
        <>
          <Text fw={600}>{t.popPeriods.totalPopulationTitle}</Text>
          <Text size="lg">{currentTotal.toLocaleString()}</Text>
          <Text size="sm" c="dimmed" mb="md">
            {previousPeriod
              ? `${t.popPeriods.vsPreviousPeriod} (${previousPeriod.voting_date}): ${previousTotal.toLocaleString()} · ${formatGrowthPercent(totalGrowthRate)}`
              : t.popPeriods.noPreviousPeriod}
          </Text>
        </>
      )}

      {selectedPeriodId && (
        <DataTable
          columns={columns}
          items={items}
          getRowKey={(entry) => entry.id}
          getSortValue={(entry, key) => (key === "pop" ? popName(entry.pop_id) : key === "actions" ? "" : entry[key])}
          initialSortKey="pop"
          loading={loading}
          error={error}
          errorText={t.common.loadError}
          emptyText={t.popPeriods.empty}
          onRowClick={openEdit}
          addRow={{ label: t.popPeriods.newButton, onClick: openCreate, disabled: pops.length === 0 }}
        />
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? t.popPeriods.modalEdit : t.popPeriods.modalNew}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Select
            label={t.popPeriods.fieldPop}
            required
            data={popOptions}
            value={form.values.pop_id ? String(form.values.pop_id) : null}
            onChange={(value) => form.setFieldValue("pop_id", value ? Number(value) : 0)}
          />
          <NumberInput
            label={t.popPeriods.fieldPopulation}
            required
            min={0}
            mt="sm"
            {...form.getInputProps("population")}
          />
          {formPreviousPopulation !== null && (
            <Text size="xs" c="dimmed" mt={4}>
              {t.popPeriods.previousPopulation}: {formPreviousPopulation.toLocaleString()} ·{" "}
              {t.popPeriods.annualChange}: {formatGrowthPercent(formGrowthRate)}
            </Text>
          )}
          <NumberInput
            label={t.popPeriods.fieldTurnout}
            required
            min={0}
            max={1}
            step={0.01}
            decimalScale={2}
            mt="sm"
            {...form.getInputProps("turnout")}
          />
          <NumberInput
            label={t.popPeriods.fieldEligibility}
            required
            min={0}
            max={1}
            step={0.01}
            decimalScale={2}
            mt="sm"
            {...form.getInputProps("eligibility")}
          />
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
