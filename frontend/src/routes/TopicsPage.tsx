import { Button, Divider, Group, Modal, Stack, Table, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { statementsApi, topicsApi } from "../api/resources";
import type { Statement, Topic, TopicInput } from "../api/types";
import { SortableTh } from "../components/SortableTh";
import { useCrud } from "../hooks/useCrud";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: TopicInput = {
  name: "",
  description: "",
};

type SortKey = "name" | "description";

export function TopicsPage() {
  const t = useTranslation();
  const { items, loading, create, update, remove } = useCrud(topicsApi);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("name");
  const sortedItems = [...items].sort((a, b) => compareSortValues(a[sortKey], b[sortKey], sortDir));
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const form = useForm<TopicInput>({ initialValues: emptyValues });

  const [statements, setStatements] = useState<Statement[]>([]);
  const [editingStatementId, setEditingStatementId] = useState<number | null>(null);
  const [statementDraft, setStatementDraft] = useState("");
  const [newStatementText, setNewStatementText] = useState("");

  const refreshStatements = async (topicId: number) => {
    setStatements(await statementsApi.list({ topic_id: topicId }));
  };

  const openCreate = () => {
    setEditing(null);
    setStatements([]);
    form.setValues(emptyValues);
    open();
  };

  const openEdit = async (topic: Topic) => {
    setEditing(topic);
    form.setValues({ name: topic.name, description: topic.description });
    await refreshStatements(topic.id);
    open();
  };

  const handleSubmit = async (values: TopicInput) => {
    try {
      if (editing) {
        await update(editing.id, values);
      } else {
        const created = await create(values);
        setEditing(created);
        await refreshStatements(created.id);
        return;
      }
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
      return;
    }
    close();
  };

  const handleDelete = async (topic: Topic) => {
    if (!window.confirm(t.topics.confirmDelete(topic.name))) return;
    await remove(topic.id);
  };

  const handleAddStatement = async () => {
    if (!editing || !newStatementText.trim()) return;
    await statementsApi.create({ topic_id: editing.id, text: newStatementText.trim() });
    setNewStatementText("");
    await refreshStatements(editing.id);
  };

  const startEditStatement = (statement: Statement) => {
    setEditingStatementId(statement.id);
    setStatementDraft(statement.text);
  };

  const saveStatement = async () => {
    if (editingStatementId === null || !editing) return;
    await statementsApi.update(editingStatementId, { text: statementDraft });
    setEditingStatementId(null);
    await refreshStatements(editing.id);
  };

  const handleDeleteStatement = async (statement: Statement) => {
    if (!editing || !window.confirm(t.topics.confirmDeleteStatement)) return;
    await statementsApi.remove(statement.id);
    await refreshStatements(editing.id);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          {t.topics.pageTitle}
        </Text>
        <Button onClick={openCreate}>{t.topics.newButton}</Button>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <SortableTh
              label={t.topics.columnName}
              sortKey="name"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.topics.columnDescription}
              sortKey="description"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedItems.map((topic) => (
            <Table.Tr key={topic.id} onClick={() => openEdit(topic)} style={{ cursor: "pointer" }}>
              <Table.Td>{topic.name}</Table.Td>
              <Table.Td>{topic.description}</Table.Td>
              <Table.Td>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(topic);
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
          {t.topics.empty}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title={editing ? t.topics.modalEdit : t.topics.modalNew} size="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label={t.topics.fieldName} required {...form.getInputProps("name")} />
          <Textarea label={t.topics.fieldDescription} mt="sm" {...form.getInputProps("description")} />
          <Button type="submit" mt="md">
            {t.common.save}
          </Button>
        </form>

        {!editing && <Text c="dimmed" size="sm" mt="md">{t.topics.statementsHint}</Text>}

        {editing && (
          <>
            <Divider my="md" />
            <Text fw={600} mb="sm">
              {t.topics.statementsSectionTitle}
            </Text>

            <Stack gap="xs" mb="sm">
              {statements.map((statement) => (
                <Group key={statement.id} align="flex-start" wrap="nowrap">
                  {editingStatementId === statement.id ? (
                    <>
                      <Textarea
                        value={statementDraft}
                        onChange={(event) => setStatementDraft(event.currentTarget.value)}
                        style={{ flex: 1 }}
                        autosize
                      />
                      <Button size="xs" onClick={saveStatement}>
                        {t.common.save}
                      </Button>
                      <Button size="xs" variant="subtle" onClick={() => setEditingStatementId(null)}>
                        {t.common.cancel}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Text style={{ flex: 1 }}>{statement.text}</Text>
                      <Button size="xs" variant="subtle" onClick={() => startEditStatement(statement)}>
                        {t.common.edit}
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteStatement(statement)}
                      >
                        {t.common.delete}
                      </Button>
                    </>
                  )}
                </Group>
              ))}
              {statements.length === 0 && (
                <Text c="dimmed" size="sm">
                  {t.topics.noStatements}
                </Text>
              )}
            </Stack>

            <Group align="flex-end" wrap="nowrap">
              <Textarea
                label={t.topics.statementFieldText}
                value={newStatementText}
                onChange={(event) => setNewStatementText(event.currentTarget.value)}
                style={{ flex: 1 }}
                autosize
              />
              <Button onClick={handleAddStatement}>{t.topics.addStatement}</Button>
            </Group>
          </>
        )}
      </Modal>
    </>
  );
}
