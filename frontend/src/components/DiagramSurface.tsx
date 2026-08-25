import { Paper, type MantineSpacing } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

import { themeConfig } from "../theme.config";

// Diagrams (charts, the hemicycle) always sit on a fixed white surface, independent of
// the app's light/dark theme — chart colors (party colors, thresholds) are calibrated
// against a neutral background, not the app's cream/espresso chrome. These CSS custom
// properties are Mantine's own theming hooks (core `--mantine-color-*` vars plus the
// documented `@mantine/charts` `--chart-*` vars); pinning them here overrides whatever
// the active color scheme would otherwise set, for every descendant.
const SURFACE_VARS = {
  background: themeConfig.diagram.background,
  "--mantine-color-body": themeConfig.diagram.background,
  "--mantine-color-text": themeConfig.diagram.text,
  "--mantine-color-dimmed": themeConfig.diagram.dimmed,
  // The chart tooltip's label/value text reads --mantine-color-bright, not
  // --mantine-color-text — left unpinned, it resolved to near-white in dark
  // mode (illegible against the tooltip's own forced-white background).
  "--mantine-color-bright": themeConfig.diagram.text,
  // Scoped to diagrams only: bumps the tooltip's font size along with anything
  // else in here sized via these tokens (e.g. the hemicycle legend).
  "--mantine-font-size-sm": "0.9375rem",
  "--mantine-font-size-md": "1.0625rem",
  "--chart-text-color": themeConfig.diagram.text,
  "--chart-grid-color": themeConfig.diagram.gridColor,
  "--chart-cursor-fill": themeConfig.diagram.cursorFill,
  "--chart-bar-label-color": themeConfig.diagram.text,
} as CSSProperties;

export function DiagramSurface({ children, mb }: { children: ReactNode; mb?: MantineSpacing }) {
  return (
    <Paper withBorder radius="md" p="md" mb={mb} style={SURFACE_VARS}>
      {children}
    </Paper>
  );
}
