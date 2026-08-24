import { Badge, Button, ColorInput, Group, Modal, NumberInput, Slider, Table, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { partiesApi } from "../api/resources";
import type { Party, PartyInput } from "../api/types";
import { SortableTh } from "../components/SortableTh";
import { useCrud } from "../hooks/useCrud";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PartyInput = {
  abbreviation: "",
  name: "",
  color_bg: "#228be6",
  color_text: "#ffffff",
  founded: null,
  dissolved: null,
  seat_orientation: 50,
};

type SortKey = "name" | "founded" | "dissolved" | "seat_orientation";

export function PartiesPage() {
  const t = useTranslation();
  const { items, loading, create, update, remove } = useCrud(partiesApi);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("name");
  const getSortValue = (party: Party, key: SortKey): string | number =>
    key === "founded" || key === "dissolved" ? (party[key] ?? -Infinity) : party[key];
  const sortedItems = [...items].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
  );
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

  const handleDelete = async (party: Party) => {
    if (!window.confirm(t.parties.confirmDelete(party.name))) return;
    await remove(party.id);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          {t.parties.pageTitle}
        </Text>
        <Button onClick={openCreate}>{t.parties.newButton}</Button>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <SortableTh
              label={t.parties.columnParty}
              sortKey="name"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.parties.columnFounded}
              sortKey="founded"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.parties.columnDissolved}
              sortKey="dissolved"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.parties.columnSeatOrientation}
              sortKey="seat_orientation"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedItems.map((party) => (
            <Table.Tr key={party.id} onClick={() => openEdit(party)} style={{ cursor: "pointer" }}>
              <Table.Td>
                <Badge color={party.color_bg} style={{ color: party.color_text }} mr="xs">
                  {party.abbreviation}
                </Badge>
                {party.name}
              </Table.Td>
              <Table.Td>{party.founded ?? "-"}</Table.Td>
              <Table.Td>{party.dissolved ?? "-"}</Table.Td>
              <Table.Td>{party.seat_orientation}</Table.Td>
              <Table.Td>
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
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {!loading && items.length === 0 && (
        <Text c="dimmed" mt="md">
          {t.parties.empty}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title={editing ? t.parties.modalEdit : t.parties.modalNew}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label={t.parties.fieldAbbreviation} required {...form.getInputProps("abbreviation")} />
          <TextInput label={t.parties.fieldName} required mt="sm" {...form.getInputProps("name")} />
          <ColorInput label={t.parties.fieldColorBg} mt="sm" {...form.getInputProps("color_bg")} />
          <ColorInput label={t.parties.fieldColorText} mt="sm" {...form.getInputProps("color_text")} />
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
