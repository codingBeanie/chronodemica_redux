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
};
