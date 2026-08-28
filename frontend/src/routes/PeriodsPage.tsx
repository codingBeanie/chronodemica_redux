import { Button, Modal, NumberInput, Select, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { periodsApi } from "../api/resources";
import type { Period, PeriodInput } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { VOTING_SYSTEMS, votingSystemLabel } from "../constants/votingSystems";
import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PeriodInput = {
  voting_date: "",
  start_date: "",
  end_date: "",
  voting_system: VOTING_SYSTEMS[0].value,
  seats: 100,
  total_population: 0,
};

type SortKey = "voting_date" | "start_date" | "end_date" | "voting_system" | "seats" | "total_population";

export function PeriodsPage() {
  const t = useTranslation();
  const { periods, loading, refresh } = usePeriodContext();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const form = useForm<PeriodInput>({ initialValues: emptyValues });

  const openCreate = () => {
    setEditing(null);
    form.setValues(emptyValues);
    open();
  };

  const openEdit = (period: Period) => {
    setEditing(period);
    form.setValues({
      voting_date: period.voting_date,
      start_date: period.start_date,
      end_date: period.end_date,
      voting_system: period.voting_system,
      seats: period.seats,
      total_population: period.total_population,
    });
    open();
  };

  const handleSubmit = async (values: PeriodInput) => {
    try {
      if (editing) {
        await periodsApi.update(editing.id, values);
      } else {
        await periodsApi.create(values);
      }
      await refresh();
      close();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    }
  };

  const handleDelete = (period: Period) => {
    confirmDialog({
      tier: "routine",
      title: t.common.delete,
      message: t.periods.confirmDelete,
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
        await periodsApi.remove(period.id);
        await refresh();
      },
    });
  };

  const columns: DataTableColumn<Period, SortKey | "actions">[] = [
    { key: "voting_date", label: t.periods.columnVotingDate, render: (period) => period.voting_date },
    { key: "start_date", label: t.periods.columnStartDate, render: (period) => period.start_date },
    { key: "end_date", label: t.periods.columnEndDate, render: (period) => period.end_date },
    {
      key: "voting_system",
      label: t.periods.columnVotingSystem,
      render: (period) => votingSystemLabel(period.voting_system),
    },
    { key: "seats", label: t.periods.columnSeats, align: "right", render: (period) => period.seats },
    {
      key: "total_population",
      label: t.periods.columnTotalPopulation,
      align: "right",
      render: (period) => period.total_population.toLocaleString(),
    },
    {
      key: "actions",
      label: null,
      sortable: false,
      render: (period) => (
        <Button
          variant="subtle"
          color="red"
          size="xs"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete(period);
          }}
        >
          {t.common.delete}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.periods.pageTitle} action={{ label: t.periods.newButton, onClick: openCreate }} />

      <DataTable
        columns={columns}
        items={periods}
        getRowKey={(period) => period.id}
        getSortValue={(period, key) =>
          key === "voting_system" ? votingSystemLabel(period.voting_system) : key === "actions" ? "" : period[key]
        }
        initialSortKey="voting_date"
        loading={loading}
        emptyText={t.periods.empty}
        onRowClick={openEdit}
        addRow={{ label: t.periods.newButton, onClick: openCreate }}
      />

      <Modal opened={opened} onClose={close} title={editing ? t.periods.modalEdit : t.periods.modalNew}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            type="date"
            label={t.periods.fieldVotingDate}
            required
            {...form.getInputProps("voting_date")}
          />
          <TextInput
            type="date"
            label={t.periods.fieldStartDate}
            required
            mt="sm"
            {...form.getInputProps("start_date")}
          />
          <TextInput
            type="date"
            label={t.periods.fieldEndDate}
            required
            mt="sm"
            {...form.getInputProps("end_date")}
          />
          <Select
            label={t.periods.fieldVotingSystem}
            required
            mt="sm"
            allowDeselect={false}
            data={VOTING_SYSTEMS.map((system) => ({ value: system.value, label: system.label }))}
            {...form.getInputProps("voting_system")}
          />
          <NumberInput
            label={t.periods.fieldSeats}
            required
            min={1}
            mt="sm"
            {...form.getInputProps("seats")}
          />
          <NumberInput
            label={t.periods.fieldTotalPopulation}
            required
            min={0}
            mt="sm"
            {...form.getInputProps("total_population")}
          />
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
