import { Group, Table } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";
import type { ReactNode } from "react";

import type { SortDirection } from "../hooks/useSort";

interface SortableThProps<Key> {
  label: ReactNode;
  sortKey: Key;
  activeKey: Key;
  direction: SortDirection;
  onSort: (key: Key) => void;
  align?: "left" | "right";
}

export function SortableTh<Key>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
}: SortableThProps<Key>) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? IconSelector : direction === "asc" ? IconChevronUp : IconChevronDown;
  return (
    <Table.Th onClick={() => onSort(sortKey)} style={{ cursor: "pointer", userSelect: "none" }} ta={align}>
      <Group gap={4} wrap="nowrap" justify={align === "right" ? "flex-end" : "flex-start"}>
        <span>{label}</span>
        <Icon size={14} opacity={isActive ? 1 : 0.4} />
      </Group>
    </Table.Th>
  );
}
