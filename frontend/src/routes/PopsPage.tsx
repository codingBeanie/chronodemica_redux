import { Badge, Button, Group, Modal, Table, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { popsApi } from "../api/resources";
import type { Pop, PopInput } from "../api/types";
import { SortableTh } from "../components/SortableTh";
import { useCrud } from "../hooks/useCrud";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PopInput = {
  abbreviation: "",
  name: "",
};

type SortKey = "name";

export function PopsPage() {
  const t = useTranslation();
  const { items, loading, create, update, remove } = useCrud(popsApi);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("name");
  const sortedItems = [...items].sort((a, b) => compareSortValues(a.name, b.name, sortDir));
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Pop | null>(null);
  const form = useForm<PopInput>({ initialValues: emptyValues });

  const openCreate = () => {
    setEditing(null);
    form.setValues(emptyValues);
    open();
  };

  const openEdit = (pop: Pop) => {
    setEditing(pop);
    form.setValues({
      abbreviation: pop.abbreviation,
      name: pop.name,
    });
    open();
  };

  const handleSubmit = async (values: PopInput) => {
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

  const handleDelete = async (pop: Pop) => {
    if (!window.confirm(t.pops.confirmDelete(pop.name))) return;
    await remove(pop.id);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          {t.pops.pageTitle}
        </Text>
        <Button onClick={openCreate}>{t.pops.newButton}</Button>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <SortableTh
              label={t.pops.columnGroup}
              sortKey="name"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedItems.map((pop) => (
            <Table.Tr key={pop.id} onClick={() => openEdit(pop)} style={{ cursor: "pointer" }}>
              <Table.Td>
                <Badge variant="light" mr="xs">
                  {pop.abbreviation}
                </Badge>
                {pop.name}
              </Table.Td>
              <Table.Td>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(pop);
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
          {t.pops.empty}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title={editing ? t.pops.modalEdit : t.pops.modalNew}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label={t.pops.fieldAbbreviation} required {...form.getInputProps("abbreviation")} />
          <TextInput label={t.pops.fieldName} required mt="sm" {...form.getInputProps("name")} />
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
