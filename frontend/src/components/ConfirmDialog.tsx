import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { ReactNode } from "react";

// Three visual tiers, from lowest to highest stakes:
// - "neutral": non-destructive confirmations (e.g. seeding demo data, switching a
//   government marking) — default brand-colored confirm button.
// - "routine": single-row deletes — red but understated (subtle variant), matching
//   how common and low-blast-radius these are.
// - "critical": account/world-level destructive actions that wipe more than one
//   record (delete world, delete all data, replace-on-import) — bold filled red
//   button, and the dialog can't be dismissed by clicking outside or pressing Escape,
//   so leaving it requires an explicit choice.
export type ConfirmTier = "neutral" | "routine" | "critical";

interface ConfirmDialogOptions {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tier?: ConfirmTier;
  onConfirm: () => void | Promise<void>;
}

export function confirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tier = "routine",
  onConfirm,
}: ConfirmDialogOptions) {
  modals.openConfirmModal({
    title,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: confirmLabel, cancel: cancelLabel },
    confirmProps:
      tier === "neutral"
        ? {}
        : tier === "critical"
          ? { color: "red", variant: "filled" }
          : { color: "red", variant: "subtle" },
    closeOnClickOutside: tier !== "critical",
    closeOnEscape: tier !== "critical",
    onConfirm,
  });
}
