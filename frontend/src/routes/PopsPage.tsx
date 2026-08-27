import { Button, Modal, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { popsApi } from "../api/resources";
import type { Pop, PopInput } from "../api/types";
import { confirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { useCrud } from "../hooks/useCrud";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: PopInput = {
  name: "",
  description: "",
};

type SortKey = "name" | "description";

export function PopsPage() {
  const t = useTranslation();
  const { items, loading, error, create, update, remove } = useCrud(popsApi);
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
      name: pop.name,
      description: pop.description,
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

  const handleDelete = (pop: Pop) => {
    confirmDialog({
      tier: "routine",
      title: t.common.delete,
      message: t.pops.confirmDelete(pop.name),
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: () => remove(pop.id),
    });
  };

  const columns: DataTableColumn<Pop, SortKey | "actions">[] = [
    { key: "name", label: t.pops.columnName, render: (pop) => pop.name },
    { key: "description", label: t.pops.columnDescription, render: (pop) => pop.description },
    {
      key: "actions",
      label: null,
      sortable: false,
      render: (pop) => (
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
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.pops.pageTitle} action={{ label: t.pops.newButton, onClick: openCreate }} />

      <DataTable
        columns={columns}
        items={items}
        getRowKey={(pop) => pop.id}
        getSortValue={(pop, key) => (key === "actions" ? "" : pop[key])}
        initialSortKey="name"
        loading={loading}
        error={error}
        errorText={t.common.loadError}
        emptyText={t.pops.empty}
        onRowClick={openEdit}
        addRow={{ label: t.pops.newButton, onClick: openCreate }}
      />

      <Modal opened={opened} onClose={close} title={editing ? t.pops.modalEdit : t.pops.modalNew}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label={t.pops.fieldName} required {...form.getInputProps("name")} />
          <Textarea label={t.pops.fieldDescription} mt="sm" {...form.getInputProps("description")} />
          <Button type="submit" mt="md" fullWidth>
            {t.common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
