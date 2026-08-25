import { Badge, Button, Divider, Modal, Stack, Table, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useRef, useState } from "react";

import { worldApi, worldsApi } from "../api/resources";
import type { World, WorldInput } from "../api/types";
import { AddRow } from "../components/AddRow";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContextOptional } from "../context/PeriodContext";
import { useWorldContext } from "../context/WorldContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: WorldInput = { name: "", parliament_name: "" };

type SortKey = "name" | "parliament_name";

export function WorldsPage() {
  const t = useTranslation();
  const { worlds, selectedWorldId, setSelectedWorldId, refresh } = useWorldContext();
  const periodCtx = usePeriodContextOptional();
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("name");
  const sortedWorlds = [...worlds].sort((a, b) => compareSortValues(a[sortKey], b[sortKey], sortDir));
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<World | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<WorldInput>({ initialValues: emptyValues });

  const openCreate = () => {
    setEditing(null);
    form.setValues(emptyValues);
    open();
  };

  const openEdit = (world: World) => {
    setEditing(world);
    form.setValues({ name: world.name, parliament_name: world.parliament_name });
    open();
  };

  const handleSubmit = async (values: WorldInput) => {
    try {
      if (editing) {
        await worldsApi.update(editing.id, values);
      } else {
        const created = await worldsApi.create(values);
        await refresh();
        setSelectedWorldId(created.id);
        close();
        return;
      }
      await refresh();
      close();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    }
  };

  const handleDelete = async (world: World) => {
    if (!window.confirm(t.worlds.confirmDelete(world.name))) return;
    try {
      await worldsApi.remove(world.id);
      await refresh();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    }
  };

  // If the world these actions target is the currently active one, its already-loaded
  // period list is now stale — refresh it too (a no-op outside a PeriodProvider, e.g.
  // when this page renders standalone before any world has been selected).
  const refreshIfActive = async (worldId: number) => {
    if (worldId === selectedWorldId) await periodCtx?.refresh();
  };

  const handleSeedDemoData = async (world: World) => {
    if (!window.confirm(t.worlds.seedConfirm)) return;
    setSeeding(true);
    try {
      await worldApi.seedDemoData(world.id);
      notifications.show({ color: "green", message: t.worlds.seedSuccessMessage });
      await refreshIfActive(world.id);
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteAllData = async (world: World) => {
    if (!window.confirm(t.worlds.deleteAllConfirm)) return;
    setDeleting(true);
    try {
      await worldApi.deleteAllData(world.id);
      notifications.show({ color: "green", message: t.worlds.deleteAllSuccessMessage });
      await refreshIfActive(world.id);
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (world: World) => {
    try {
      const { blob, filename } = await worldApi.exportWorld(world.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    }
  };

  const handleImportFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editing) return;
    if (!window.confirm(t.worlds.importConfirm)) return;
    setImporting(true);
    try {
      const updated = await worldApi.importWorld(editing.id, file);
      setEditing(updated);
      form.setValues({ name: updated.name, parliament_name: updated.parliament_name });
      notifications.show({ color: "green", message: t.worlds.importSuccessMessage });
      await refresh();
      await refreshIfActive(updated.id);
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Text size="xl" fw={700} mb="xs">
        {t.worlds.pageTitle}
      </Text>
      <Button onClick={openCreate} mb="md">
        {t.worlds.newButton}
      </Button>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <SortableTh
              label={t.worlds.columnName}
              sortKey="name"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <SortableTh
              label={t.worlds.columnParliament}
              sortKey="parliament_name"
              activeKey={sortKey}
              direction={sortDir}
              onSort={toggleSort}
            />
            <Table.Th />
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedWorlds.map((world) => (
            <Table.Tr key={world.id} onClick={() => openEdit(world)} style={{ cursor: "pointer" }}>
              <Table.Td>{world.name}</Table.Td>
              <Table.Td>{world.parliament_name}</Table.Td>
              <Table.Td>
                {world.id === selectedWorldId ? (
                  <Badge color="green">{t.worlds.activeLabel}</Badge>
                ) : (
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedWorldId(world.id);
                    }}
                  >
                    {t.worlds.switchButton}
                  </Button>
                )}
              </Table.Td>
              <Table.Td>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(world);
                  }}
                >
                  {t.common.delete}
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
          <AddRow colSpan={4} onClick={openCreate} label={t.worlds.newButton} />
        </Table.Tbody>
      </Table>

      {worlds.length === 0 && (
        <Text c="dimmed" mt="md">
          {t.worlds.empty}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title={editing ? t.worlds.modalEdit : t.worlds.modalNew}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label={t.worlds.fieldName} required {...form.getInputProps("name")} />
          <TextInput
            label={t.worlds.fieldParliamentName}
            required
            mt="sm"
            {...form.getInputProps("parliament_name")}
          />
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>

        {editing && (
          <>
            <Divider my="md" />
            <Stack gap="sm">
              <Button variant="outline" fullWidth onClick={() => handleSeedDemoData(editing)} loading={seeding}>
                {t.worlds.seedButton}
              </Button>
              <Button variant="outline" fullWidth onClick={() => handleExport(editing)}>
                {t.worlds.exportButton}
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => importInputRef.current?.click()}
                loading={importing}
              >
                {t.worlds.importButton}
              </Button>
              <Button
                variant="outline"
                color="red"
                fullWidth
                onClick={() => handleDeleteAllData(editing)}
                loading={deleting}
              >
                {t.worlds.deleteAllButton}
              </Button>
            </Stack>
            <input
              ref={importInputRef}
              type="file"
              accept=".db,.sqlite,application/octet-stream"
              style={{ display: "none" }}
              onChange={handleImportFileSelected}
            />
          </>
        )}
      </Modal>
    </>
  );
}
