import { Button, Group, Modal, NumberInput, Select, Table, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { periodsApi } from "../api/resources";
import type { Period, PeriodInput } from "../api/types";
import { VOTING_SYSTEMS, votingSystemLabel } from "../constants/votingSystems";
import { usePeriodContext } from "../context/PeriodContext";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PeriodInput = {
  voting_date: "",
  start_date: "",
  end_date: "",
  voting_system: VOTING_SYSTEMS[0].value,
  seats: 100,
};

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
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          {t.periods.pageTitle}
        </Text>
        <Button onClick={openCreate}>{t.periods.newButton}</Button>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t.periods.columnVotingDate}</Table.Th>
            <Table.Th>{t.periods.columnStartDate}</Table.Th>
            <Table.Th>{t.periods.columnEndDate}</Table.Th>
            <Table.Th>{t.periods.columnVotingSystem}</Table.Th>
            <Table.Th ta="right">{t.periods.columnSeats}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {periods.map((period) => (
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
