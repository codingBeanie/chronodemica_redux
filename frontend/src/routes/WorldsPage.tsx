import { Badge, Button, Divider, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useRef, useState } from "react";

import { worldApi, worldsApi } from "../api/resources";
import type { World, WorldInput } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { usePeriodContextOptional } from "../context/PeriodContext";
import { useWorldContext } from "../context/WorldContext";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: WorldInput = { name: "", parliament_name: "" };

type SortKey = "name" | "parliament_name";

export function WorldsPage() {
  const t = useTranslation();
  const { worlds, loading, selectedWorldId, setSelectedWorldId, refresh } = useWorldContext();
  const periodCtx = usePeriodContextOptional();
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

  const handleDelete = (world: World) => {
    confirmDialog({
      tier: "critical",
      title: t.worlds.pageTitle,
      message: t.worlds.confirmDelete(world.name),
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
        try {
          await worldsApi.remove(world.id);
          await refresh();
        } catch (error) {
          notifications.show({ color: "red", message: String(error) });
        }
      },
    });
  };

  // If the world these actions target is the currently active one, its already-loaded
  // period list is now stale — refresh it too (a no-op outside a PeriodProvider, e.g.
  // when this page renders standalone before any world has been selected).
  const refreshIfActive = async (worldId: number) => {
    if (worldId === selectedWorldId) await periodCtx?.refresh();
  };

  const handleSeedDemoData = (world: World) => {
    confirmDialog({
      tier: "neutral",
      title: t.worlds.seedButton,
      message: t.worlds.seedConfirm,
      confirmLabel: t.worlds.seedButton,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
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
      },
    });
  };

  const handleDeleteAllData = (world: World) => {
    confirmDialog({
      tier: "critical",
      title: t.worlds.deleteAllButton,
      message: t.worlds.deleteAllConfirm,
      confirmLabel: t.worlds.deleteAllButton,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
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
      },
    });
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

  const handleImportFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editing) return;
    const target = editing;
    confirmDialog({
      tier: "critical",
      title: t.worlds.importButton,
      message: t.worlds.importConfirm,
      confirmLabel: t.worlds.importButton,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
        setImporting(true);
        try {
          const updated = await worldApi.importWorld(target.id, file);
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
      },
    });
  };

  const columns: DataTableColumn<World, SortKey | "status" | "actions">[] = [
    { key: "name", label: t.worlds.columnName, render: (world) => world.name },
    { key: "parliament_name", label: t.worlds.columnParliament, render: (world) => world.parliament_name },
    {
      key: "status",
      label: null,
      sortable: false,
      render: (world) =>
        world.id === selectedWorldId ? (
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
        ),
    },
    {
      key: "actions",
      label: null,
      sortable: false,
      render: (world) => (
        <Button
          variant="filled"
          color="red"
          size="xs"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete(world);
          }}
        >
          {t.common.delete}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.worlds.pageTitle} action={{ label: t.worlds.newButton, onClick: openCreate }} />

      <DataTable
        columns={columns}
        items={worlds}
        getRowKey={(world) => world.id}
        getSortValue={(world, key) =>
          key === "name" ? world.name : key === "parliament_name" ? world.parliament_name : ""
        }
        initialSortKey="name"
        loading={loading}
        emptyText={t.worlds.empty}
        onRowClick={openEdit}
        addRow={{ label: t.worlds.newButton, onClick: openCreate }}
      />

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
                variant="filled"
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
