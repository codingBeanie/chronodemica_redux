import { Paper, type MantineSpacing } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

// Diagrams (charts, the hemicycle) always sit on a fixed white surface, independent of
// the app's light/dark theme — chart colors (party colors, thresholds) are calibrated
// against a neutral background, not the app's cream/espresso chrome. These CSS custom
// properties are Mantine's own theming hooks (core `--mantine-color-*` vars plus the
// documented `@mantine/charts` `--chart-*` vars); pinning them here overrides whatever
// the active color scheme would otherwise set, for every descendant.
const SURFACE_VARS = {
  background: "#FFFFFF",
  "--mantine-color-body": "#FFFFFF",
  "--mantine-color-text": "var(--mantine-color-gray-8)",
  "--mantine-color-dimmed": "var(--mantine-color-gray-6)",
  "--chart-text-color": "var(--mantine-color-gray-7)",
  "--chart-grid-color": "rgba(173, 181, 189, 0.6)",
  "--chart-cursor-fill": "rgba(173, 181, 189, 0.15)",
  "--chart-bar-label-color": "var(--mantine-color-gray-7)",
} as CSSProperties;

export function DiagramSurface({ children, mb }: { children: ReactNode; mb?: MantineSpacing }) {
  return (
    <Paper withBorder radius="md" p="md" mb={mb} style={SURFACE_VARS}>
      {children}
    </Paper>
  );
}
