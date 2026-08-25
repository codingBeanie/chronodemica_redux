import { Group, Table, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { useTranslation } from "../i18n/I18nProvider";

interface AddRowProps {
  colSpan: number;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}

/** Placeholder row at the end of a list table — click anywhere on it to open the same create modal. */
export function AddRow({ colSpan, onClick, disabled, label }: AddRowProps) {
  const t = useTranslation();
  return (
    <Table.Tr
      onClick={disabled ? undefined : onClick}
      style={{ cursor: disabled ? "default" : "pointer" }}
      aria-label={label}
    >
      <Table.Td colSpan={colSpan}>
        <Group gap="xs" wrap="nowrap" c={disabled ? "dimmed" : undefined}>
          <IconPlus size={16} />
          <Text size="sm">{t.common.clickToAdd}</Text>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
