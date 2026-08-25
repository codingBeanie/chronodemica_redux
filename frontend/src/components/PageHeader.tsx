import { Button, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  action?: PageHeaderAction;
  /** Extra buttons rendered alongside `action` (e.g. a secondary "Adopt All" button). */
  children?: ReactNode;
}

/** Page title + optional subtitle + a left-aligned action-button row underneath. */
export function PageHeader({ title, subtitle, action, children }: PageHeaderProps) {
  return (
    <Stack gap={4} mb="md">
      <Text size="xl" fw={700}>
        {title}
      </Text>
      {subtitle && (
        <Text c="dimmed" size="sm">
          {subtitle}
        </Text>
      )}
      {(action || children) && (
        <Group gap="sm" mt="xs">
          {action && (
            <Button onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          )}
          {children}
        </Group>
      )}
    </Stack>
  );
}
