import { Button, Group, Modal, NumberInput, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import { partiesApi, partyPeriodsApi } from "../api/resources";
import type { Party, PartyPeriod, PartyPeriodInput } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodContext } from "../context/PeriodContext";
import { useCrud } from "../hooks/useCrud";
import { useTranslation } from "../i18n/I18nProvider";
import { isPartyActiveAt } from "../utils/partyDisplay";

const emptyValues: PartyPeriodInput = { party_id: 0, period_id: 0, popularity: 10 };

type SortKey = "party" | "popularity";

export function PartyPeriodsPage() {
  const t = useTranslation();
  const { periods, selectedPeriodId } = usePeriodContext();
  const { items, loading, error, create, update, remove, refresh } = useCrud(partyPeriodsApi, {
    period_id: selectedPeriodId ?? 0,
  });
  const [parties, setParties] = useState<Party[]>([]);
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

  const handleDelete = (entry: PartyPeriod) => {
    confirmDialog({
      tier: "routine",
      title: t.common.delete,
      message: t.partyPeriods.confirmDelete,
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: () => remove(entry.id),
    });
  };

  const columns: DataTableColumn<PartyPeriod, SortKey | "actions">[] = [
    { key: "party", label: t.partyPeriods.columnParty, render: (entry) => partyName(entry.party_id) },
    { key: "popularity", label: t.partyPeriods.columnPopularity, render: (entry) => entry.popularity },
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
      <PageHeader title={t.partyPeriods.pageTitle} />

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
        <DataTable
          columns={columns}
          items={items}
          getRowKey={(entry) => entry.id}
          getSortValue={(entry, key) =>
            key === "party" ? partyName(entry.party_id) : key === "popularity" ? entry.popularity : ""
          }
          initialSortKey="party"
          loading={loading}
          error={error}
          errorText={t.common.loadError}
          emptyText={t.partyPeriods.empty}
          onRowClick={openEdit}
          addRow={{
            label: t.partyPeriods.newButton,
            onClick: openCreate,
            disabled: selectableParties.length === 0,
          }}
        />
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
