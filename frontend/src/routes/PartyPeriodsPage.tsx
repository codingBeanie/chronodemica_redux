import { Button, Group, Modal, NumberInput, Select, Table, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import { partiesApi, partyPeriodsApi } from "../api/resources";
import type { Party, PartyPeriod, PartyPeriodInput } from "../api/types";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodContext } from "../context/PeriodContext";
import { useCrud } from "../hooks/useCrud";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PartyPeriodInput = { party_id: 0, period_id: 0, popularity: 10 };

export function PartyPeriodsPage() {
  const t = useTranslation();
  const { selectedPeriodId } = usePeriodContext();
  const { items, loading, create, update, remove } = useCrud(partyPeriodsApi, {
    period_id: selectedPeriodId ?? 0,
  });
  const [parties, setParties] = useState<Party[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<PartyPeriod | null>(null);
  const form = useForm<PartyPeriodInput>({ initialValues: emptyValues });

  useEffect(() => {
    partiesApi.list().then(setParties);
  }, []);

  const partyName = (id: number) => parties.find((p) => p.id === id)?.name ?? "-";
  const partyOptions = parties.map((p) => ({ value: String(p.id), label: p.name }));

  const openCreate = () => {
    setEditing(null);
    form.setValues({ ...emptyValues, period_id: selectedPeriodId ?? 0 });
    open();
  };

  const openEdit = (entry: PartyPeriod) => {
    setEditing(entry);
    form.setValues({ party_id: entry.party_id, period_id: entry.period_id, popularity: entry.popularity });
    open();
  };

  const handleSubmit = async (values: PartyPeriodInput) => {
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

  const handleDelete = async (entry: PartyPeriod) => {
    if (!window.confirm(t.partyPeriods.confirmDelete)) return;
    await remove(entry.id);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          {t.partyPeriods.pageTitle}
        </Text>
        <Button onClick={openCreate} disabled={!selectedPeriodId || parties.length === 0}>
          {t.partyPeriods.newButton}
        </Button>
      </Group>

      <PeriodSelector />

      {selectedPeriodId && (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t.partyPeriods.columnParty}</Table.Th>
              <Table.Th>{t.partyPeriods.columnPopularity}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((entry) => (
              <Table.Tr key={entry.id} onClick={() => openEdit(entry)} style={{ cursor: "pointer" }}>
                <Table.Td>{partyName(entry.party_id)}</Table.Td>
                <Table.Td>{entry.popularity}</Table.Td>
                <Table.Td>
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
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {selectedPeriodId && !loading && items.length === 0 && (
        <Text c="dimmed" mt="md">
          {t.partyPeriods.empty}
        </Text>
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? t.partyPeriods.modalEdit : t.partyPeriods.modalNew}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Select
            label={t.partyPeriods.fieldParty}
            required
            data={partyOptions}
            value={form.values.party_id ? String(form.values.party_id) : null}
            onChange={(value) => form.setFieldValue("party_id", value ? Number(value) : 0)}
          />
          <NumberInput
            label={t.partyPeriods.fieldPopularity}
            required
            min={1}
            max={20}
            mt="sm"
            {...form.getInputProps("popularity")}
          />
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
