import { Button, Group, Modal, Select, Table, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import { statementsApi, topicsApi } from "../api/resources";
import type { Statement, StatementInput, Topic } from "../api/types";
import { AddRow } from "../components/AddRow";
import { useCrud } from "../hooks/useCrud";

const emptyValues: StatementInput = { topic_id: 0, text: "" };

export function StatementsPage() {
  const { items, loading, create, update, remove } = useCrud(statementsApi);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Statement | null>(null);
  const form = useForm<StatementInput>({ initialValues: emptyValues });

  useEffect(() => {
    topicsApi.list().then(setTopics);
  }, []);

  const topicName = (topicId: number) => topics.find((t) => t.id === topicId)?.name ?? "-";
  const topicOptions = topics.map((t) => ({ value: String(t.id), label: t.name }));

  const openCreate = () => {
    setEditing(null);
    form.setValues(emptyValues);
    open();
  };

  const openEdit = (statement: Statement) => {
    setEditing(statement);
    form.setValues({ topic_id: statement.topic_id, text: statement.text });
    open();
  };

  const handleSubmit = async (values: StatementInput) => {
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

  const handleDelete = async (statement: Statement) => {
    if (!window.confirm("Statement wirklich löschen?")) return;
    await remove(statement.id);
  };

  return (
    <>
      <Text size="xl" fw={700} mb="xs">
        Statements
      </Text>
      <Button onClick={openCreate} disabled={topics.length === 0} mb="md">
        New Statement
      </Button>

      {topics.length === 0 && (
        <Text c="dimmed" mb="md">
          Lege zuerst ein Topic an, bevor du Statements anlegen kannst.
        </Text>
      )}

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Topic</Table.Th>
            <Table.Th>Statement</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((statement) => (
            <Table.Tr key={statement.id}>
              <Table.Td>{topicName(statement.topic_id)}</Table.Td>
              <Table.Td>{statement.text}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button variant="subtle" size="xs" onClick={() => openEdit(statement)}>
                    Edit
                  </Button>
                  <Button variant="subtle" color="red" size="xs" onClick={() => handleDelete(statement)}>
                    Delete
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
          <AddRow colSpan={3} onClick={openCreate} disabled={topics.length === 0} label="New Statement" />
        </Table.Tbody>
      </Table>

      {!loading && items.length === 0 && (
        <Text c="dimmed" mt="md">
          No statements yet.
        </Text>
      )}

      <Modal opened={opened} onClose={close} title={editing ? "Edit Statement" : "New Statement"}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Select
            label="Topic"
            required
            data={topicOptions}
            value={form.values.topic_id ? String(form.values.topic_id) : null}
            onChange={(value) => form.setFieldValue("topic_id", value ? Number(value) : 0)}
          />
          <Textarea label="Text" required mt="sm" {...form.getInputProps("text")} />
          <Button type="submit" mt="md" fullWidth>
            Save
          </Button>
        </form>
      </Modal>
    </>
  );
}
