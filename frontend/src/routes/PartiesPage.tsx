import { Badge, Button, ColorInput, Modal, NumberInput, Slider, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { partiesApi } from "../api/resources";
import type { Party, PartyInput } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { useCrud } from "../hooks/useCrud";
import { useTranslation } from "../i18n/I18nProvider";
import { themeConfig } from "../theme.config";
import { contrastRatio, MIN_AA_CONTRAST } from "../utils/colorContrast";

const emptyValues: PartyInput = {
  abbreviation: "",
  name: "",
  color_bg: themeConfig.brand,
  color_text: themeConfig.surface,
  founded: null,
  dissolved: null,
  seat_orientation: 50,
};

type SortKey = "name" | "founded" | "dissolved" | "seat_orientation";

export function PartiesPage() {
  const t = useTranslation();
  const { items, loading, error, create, update, remove } = useCrud(partiesApi);
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const form = useForm<PartyInput>({ initialValues: emptyValues });

  const openCreate = () => {
    setEditing(null);
    form.setValues(emptyValues);
    open();
  };

  const openEdit = (party: Party) => {
    setEditing(party);
    form.setValues({
      abbreviation: party.abbreviation,
      name: party.name,
      color_bg: party.color_bg,
      color_text: party.color_text,
      founded: party.founded,
      dissolved: party.dissolved,
      seat_orientation: party.seat_orientation,
    });
    open();
  };

  const handleSubmit = async (values: PartyInput) => {
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

  const handleDelete = (party: Party) => {
    confirmDialog({
      tier: "routine",
      title: t.common.delete,
      message: t.parties.confirmDelete(party.name),
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: () => remove(party.id),
    });
  };

  const colorRatio = contrastRatio(form.values.color_bg, form.values.color_text);
  const lowContrast = colorRatio < MIN_AA_CONTRAST;

  const columns: DataTableColumn<Party, SortKey | "actions">[] = [
    {
      key: "name",
      label: t.parties.columnParty,
      render: (party) => (
        <>
          <Badge color={party.color_bg} style={{ color: party.color_text }} mr="xs">
            {party.abbreviation}
          </Badge>
          {party.name}
        </>
      ),
    },
    { key: "founded", label: t.parties.columnFounded, render: (party) => party.founded ?? "-" },
    { key: "dissolved", label: t.parties.columnDissolved, render: (party) => party.dissolved ?? "-" },
    {
      key: "seat_orientation",
      label: t.parties.columnSeatOrientation,
      render: (party) => party.seat_orientation,
    },
    {
      key: "actions",
      label: null,
      sortable: false,
      render: (party) => (
        <Button
          variant="subtle"
          color="red"
          size="xs"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete(party);
          }}
        >
          {t.common.delete}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.parties.pageTitle} action={{ label: t.parties.newButton, onClick: openCreate }} />

      <DataTable
        columns={columns}
        items={items}
        getRowKey={(party) => party.id}
        getSortValue={(party, key) => (key === "founded" || key === "dissolved" ? (party[key] ?? -Infinity) : key === "actions" ? "" : party[key])}
        initialSortKey="name"
        loading={loading}
        error={error}
        errorText={t.common.loadError}
        emptyText={t.parties.empty}
        onRowClick={openEdit}
        addRow={{ label: t.parties.newButton, onClick: openCreate }}
      />

      <Modal opened={opened} onClose={close} title={editing ? t.parties.modalEdit : t.parties.modalNew}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label={t.parties.fieldAbbreviation} required {...form.getInputProps("abbreviation")} />
          <TextInput label={t.parties.fieldName} required mt="sm" {...form.getInputProps("name")} />
          <ColorInput label={t.parties.fieldColorBg} mt="sm" {...form.getInputProps("color_bg")} />
          <ColorInput label={t.parties.fieldColorText} mt="sm" {...form.getInputProps("color_text")} />
          {lowContrast && (
            <Text size="xs" c="orange" mt={4}>
              {t.parties.lowContrastWarning(colorRatio)}
            </Text>
          )}
          <NumberInput label={t.parties.fieldFounded} mt="sm" {...form.getInputProps("founded")} />
          <NumberInput label={t.parties.fieldDissolved} mt="sm" {...form.getInputProps("dissolved")} />
          <Text size="sm" fw={500} mt="sm">
            {t.parties.fieldSeatOrientation}
          </Text>
          <Slider
            min={0}
            max={100}
            marks={[
              { value: 0, label: "0" },
              { value: 50, label: "50" },
              { value: 100, label: "100" },
            ]}
            mb="lg"
            {...form.getInputProps("seat_orientation")}
          />
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
