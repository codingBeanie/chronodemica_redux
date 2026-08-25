import { ActionIcon, Alert, Loader, Table, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import type { ComponentType, ReactNode } from "react";

import { compareSortValues, useSort, type SortDirection } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";
import { AddRow } from "./AddRow";
import { SortableTh } from "./SortableTh";

export interface DataTableColumn<T, Key extends string> {
  key: Key;
  label: ReactNode;
  align?: "left" | "right";
  /** Set false for columns with no meaningful sort value (e.g. an actions column). */
  sortable?: boolean;
  render: (item: T) => ReactNode;
}

interface DataTableAddRow {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface DataTableProps<T, Key extends string> {
  columns: DataTableColumn<T, Key>[];
  items: T[];
  getRowKey: (item: T) => string | number;
  getSortValue: (item: T, key: Key) => string | number;
  initialSortKey: Key;
  initialSortDir?: SortDirection;
  loading?: boolean;
  error?: unknown;
  emptyText?: string;
  errorText?: string;
  onRowClick?: (item: T) => void;
  addRow?: DataTableAddRow;
  /** Overrides the auto-injected row-action button's label/icon (defaults to "Edit" + a pencil). */
  rowActionLabel?: string;
  rowActionIcon?: ComponentType<{ size?: number }>;
}

/**
 * Generic CRUD list table: sortable headers, loading/error/empty states, an
 * optional keyboard-operable row-click-to-edit affordance, and an optional
 * trailing AddRow. Wraps the useSort + SortableTh + AddRow combo that used to
 * be hand-wired per page.
 */
export function DataTable<T, Key extends string>({
  columns,
  items,
  getRowKey,
  getSortValue,
  initialSortKey,
  initialSortDir,
  loading,
  error,
  emptyText,
  errorText,
  onRowClick,
  addRow,
  rowActionLabel,
  rowActionIcon,
}: DataTableProps<T, Key>) {
  const t = useTranslation();
  const { sortKey, sortDir, toggleSort } = useSort<Key>(initialSortKey, initialSortDir);
  const sortedItems = [...items].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
  );

  // A native <tr> keeps its implicit "row" ARIA role (and its cells stay "cell"s) —
  // overriding that to role="button" would break table semantics for screen readers.
  // Keyboard/AT users instead get a real, focusable per-row action button; mouse users
  // can still click anywhere on the row.
  const RowActionIcon = rowActionIcon ?? IconPencil;
  const editColumn: DataTableColumn<T, Key> | null = onRowClick
    ? {
        key: "__rowAction" as Key,
        label: null,
        sortable: false,
        render: (item: T) => (
          <ActionIcon
            variant="subtle"
            aria-label={rowActionLabel ?? t.common.edit}
            onClick={(event) => {
              event.stopPropagation();
              onRowClick(item);
            }}
          >
            <RowActionIcon size={16} />
          </ActionIcon>
        ),
      }
    : null;
  const effectiveColumns = editColumn ? [...columns, editColumn] : columns;
  const colSpan = effectiveColumns.length;

  return (
    <>
      {error != null && (
        <Alert color="red" mb="sm">
          {errorText}
        </Alert>
      )}

      <Table>
        <Table.Thead>
          <Table.Tr>
            {effectiveColumns.map((col) =>
              col.sortable === false ? (
                <Table.Th key={col.key} ta={col.align}>
                  {col.label}
                </Table.Th>
              ) : (
                <SortableTh
                  key={col.key}
                  label={col.label}
                  sortKey={col.key}
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                  align={col.align}
                />
              ),
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading && (
            <Table.Tr>
              <Table.Td colSpan={colSpan}>
                <Loader size="sm" />
              </Table.Td>
            </Table.Tr>
          )}
          {!loading &&
            sortedItems.map((item) => (
              <Table.Tr
                key={getRowKey(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {effectiveColumns.map((col) => (
                  <Table.Td key={col.key} ta={col.align}>
                    {col.render(item)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          {!loading && addRow && (
            <AddRow colSpan={colSpan} onClick={addRow.onClick} disabled={addRow.disabled} label={addRow.label} />
          )}
        </Table.Tbody>
      </Table>

      {!loading && !error && items.length === 0 && emptyText && (
        <Text c="dimmed" mt="md">
          {emptyText}
        </Text>
      )}
    </>
  );
}
