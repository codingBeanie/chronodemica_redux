// Chronodemica color scheme — edit these hex values to re-theme the app.
// theme.ts derives full Mantine color ramps (light tints + dark shades) and
// a matching dark-mode surface palette from these four base colors.

export const themeConfig = {
  // Page canvas background in light mode (AppShell, Paper, modals by Mantine's default).
  background: "#EBEBEB",
  // Elevated/interactive surfaces in light mode — inputs, dropdowns, and anything
  // manually set to stand out against the page canvas (Mantine's "white"). Kept
  // distinct from `background` so these don't visually disappear into the page.
  surface: "#FFFFFF",
  // Primary action color: buttons, active nav, links, focus rings.
  brand: "#4F2000",
  // Danger/destructive color: delete buttons, required-field marks, form errors.
  red: "#A31D1D",
  // Accent/warning color.
  yellow: "#FEBA18",
  // Explicit font stack (system fonts only, no webfont network dependency) and
  // default corner radius — applied app-wide via createTheme() in theme.ts.
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: "md",
  // Diagrams (charts, the hemicycle) always render on a fixed neutral surface,
  // independent of the app's light/dark theme — see DiagramSurface.tsx for why.
  diagram: {
    background: "#FFFFFF",
    text: "#1A1A1A",
    dimmed: "#495057",
    gridColor: "rgba(173, 181, 189, 0.6)",
    cursorFill: "rgba(173, 181, 189, 0.15)",
    // Outline drawn around a seat dot for the party currently in government.
    governmentOutline: "#000000",
    // The connected party-name bar and the individual change-vs-previous-period
    // boxes in VotingResultsChart.
    nameBarBackground: "#DEE2E6",
    changeBoxBackground: "#F1F3F5",
  },
};
