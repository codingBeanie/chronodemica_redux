import { Button, Group, Modal, NumberInput, Select, Table, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import { partiesApi, partyPeriodsApi } from "../api/resources";
import type { Party, PartyPeriod, PartyPeriodInput } from "../api/types";
import { AddRow } from "../components/AddRow";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContext } from "../context/PeriodContext";
import { useCrud } from "../hooks/useCrud";
import { compareSortValues, useSort } from "../hooks/useSort";
import { isPartyActiveAt } from "../utils/partyDisplay";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PartyPeriodInput = { party_id: 0, period_id: 0, popularity: 10 };

type SortKey = "party" | "popularity";

export function PartyPeriodsPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId } = usePeriodContext();
  const { items, loading, create, update, remove, refresh } = useCrud(partyPeriodsApi, {
    period_id: selectedPeriodId ?? 0,
  });
  const [parties, setParties] = useState<Party[]>([]);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("party");
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<PartyPeriod | null>(null);
  const [previousItems, setPreviousItems] = useState<PartyPeriod[]>([]);
  const form = useForm<PartyPeriodInput>({ initialValues: emptyValues });

  useEffect(() => {
    partiesApi.list().then(setParties);
  }, []);

  const currentPeriod = periods.find((p) => p.id === selectedPeriodId) ?? null;
  const sortedPeriods = [...periods].sort((a, b) => a.voting_date.localeCompare(b.voting_date));
  const currentIndex = sortedPeriods.findIndex((p) => p.id === selectedPeriodId);
  const previousPeriod = currentIndex > 0 ? sortedPeriods[currentIndex - 1] : null;

  useEffect(() => {
    if (previousPeriod) {
      partyPeriodsApi.list({ period_id: previousPeriod.id }).then(setPreviousItems);
    } else {
      setPreviousItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousPeriod?.id]);

  const partyName = (id: number) => parties.find((p) => p.id === id)?.name ?? "-";
  // Parties that hadn't been founded yet, or were already dissolved, at this period's
  // voting date are excluded — except one already assigned to the entry being edited.
  const selectableParties = parties.filter(
    (p) => p.id === editing?.party_id || !currentPeriod || isPartyActiveAt(p, currentPeriod.voting_date),
  );
  const partyOptions = selectableParties.map((p) => ({ value: String(p.id), label: p.name }));
  const adoptableParties = currentPeriod
    ? parties.filter(
        (p) => isPartyActiveAt(p, currentPeriod.voting_date) && !items.some((item) => item.party_id === p.id),
      )
    : [];

  const handleAdoptAll = async () => {
    if (!currentPeriod || adoptableParties.length === 0) return;
    await Promise.all(
      adoptableParties.map((party) =>
        partyPeriodsApi.create({
          party_id: party.id,
          period_id: currentPeriod.id,
          popularity: previousItems.find((pi) => pi.party_id === party.id)?.popularity ?? emptyValues.popularity,
        }),
      ),
    );
    await refresh();
  };

  const getSortValue = (entry: PartyPeriod, key: SortKey): string | number =>
    key === "party" ? partyName(entry.party_id) : entry.popularity;
  const sortedItems = [...items].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
  );

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
      <Text size="xl" fw={700} mb="xs">
        {t.partyPeriods.pageTitle}
      </Text>

      <PeriodSelector />

      <Group gap="sm" mb="md">
        <Button onClick={openCreate} disabled={!selectedPeriodId || selectableParties.length === 0}>
          {t.partyPeriods.newButton}
        </Button>
        <Button variant="default" onClick={handleAdoptAll} disabled={adoptableParties.length === 0}>
          {t.partyPeriods.adoptAllButton}
        </Button>
      </Group>

      {selectedPeriodId && (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <SortableTh
                label={t.partyPeriods.columnParty}
                sortKey="party"
                activeKey={sortKey}
                direction={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label={t.partyPeriods.columnPopularity}
                sortKey="popularity"
                activeKey={sortKey}
                direction={sortDir}
                onSort={toggleSort}
              />
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedItems.map((entry) => (
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
            <AddRow
              colSpan={3}
              onClick={openCreate}
              disabled={selectableParties.length === 0}
              label={t.partyPeriods.newButton}
            />
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
