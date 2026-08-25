import { Button, Modal, NumberInput, Select, Table, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { periodsApi } from "../api/resources";
import type { Period, PeriodInput } from "../api/types";
import { AddRow } from "../components/AddRow";
import { SortableTh } from "../components/SortableTh";
import { VOTING_SYSTEMS, votingSystemLabel } from "../constants/votingSystems";
import { usePeriodContext } from "../context/PeriodContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PeriodInput = {
  voting_date: "",
  start_date: "",
  end_date: "",
  voting_system: VOTING_SYSTEMS[0].value,
  seats: 100,
};

type SortKey = "voting_date" | "start_date" | "end_date" | "voting_system" | "seats";

export function PeriodsPage() {
  const t = useTranslation();
  const { periods, loading, refresh } = usePeriodContext();
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("voting_date");
  const getSortValue = (period: Period, key: SortKey): string | number =>
    key === "voting_system" ? votingSystemLabel(period.voting_system) : period[key];
  const sortedPeriods = [...periods].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
  );
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

  const handleDelete = async (period: Period) => {
    if (!window.confirm(t.periods.confirmDelete)) return;
    await periodsApi.remove(period.id);
    await refresh();
  };

  return (
    <>
      <Text size="xl" fw={700} mb="xs">
        {t.periods.pageTitle}
      </Text>
      <Button onClick={openCreate} mb="md">
        {t.periods.newButton}
      </Button>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <SortableTh
              label={t.periods.columnVotingDate}
              sortKey="voting_date"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.periods.columnStartDate}
              sortKey="start_date"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.periods.columnEndDate}
              sortKey="end_date"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.periods.columnVotingSystem}
              sortKey="voting_system"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.periods.columnSeats}
              sortKey="seats"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
              align="right"
            />
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedPeriods.map((period) => (
            <Table.Tr key={period.id} onClick={() => openEdit(period)} style={{ cursor: "pointer" }}>
              <Table.Td>{period.voting_date}</Table.Td>
              <Table.Td>{period.start_date}</Table.Td>
              <Table.Td>{period.end_date}</Table.Td>
              <Table.Td>{votingSystemLabel(period.voting_system)}</Table.Td>
              <Table.Td ta="right">{period.seats}</Table.Td>
              <Table.Td>
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
              </Table.Td>
            </Table.Tr>
          ))}
          <AddRow colSpan={6} onClick={openCreate} label={t.periods.newButton} />
        </Table.Tbody>
      </Table>

      {!loading && periods.length === 0 && (
        <Text c="dimmed" mt="md">
          {t.periods.empty}
        </Text>
      )}

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
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
