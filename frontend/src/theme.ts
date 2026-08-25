import { createTheme, Modal, Paper, Card, Table, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";

import { themeConfig } from "./theme.config";

// Builds full 10-shade Mantine color ramps and a matching dark-mode surface
// palette from the four base colors in theme.config.ts. Edit that file to
// re-theme the app — this file only contains the (design-system-agnostic)
// math that turns a single brand hex into a usable ramp.

type RGB = [number, number, number];
type HSL = [number, number, number]; // h: 0-360, s/l: 0-1

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: RGB): string {
  const toHex = (c: number) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl([r, g, b]: RGB): HSL {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rN:
      h = (gN - bN) / d + (gN < bN ? 6 : 0);
      break;
    case gN:
      h = (bN - rN) / d + 2;
      break;
    default:
      h = (rN - gN) / d + 4;
  }
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: HSL): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hN = h / 360;
  return [
    hue2rgb(p, q, hN + 1 / 3) * 255,
    hue2rgb(p, q, hN) * 255,
    hue2rgb(p, q, hN - 1 / 3) * 255,
  ];
}

/**
 * Places `baseHex` at `baseIndex` of a 10-shade ramp, generating lighter
 * tints below it (toward `lightTargetL`, desaturating as it lightens) and
 * darker shades above it (toward `darkTargetL`).
 */
function buildRamp(
  baseHex: string,
  baseIndex = 6,
  lightTargetL = 0.95,
  darkTargetL = 0.09,
  desatLight = 0.55,
  desatDarkBoost = 0.1,
): MantineColorsTuple {
  const [h, s, l] = rgbToHsl(hexToRgb(baseHex));
  const ramp: string[] = new Array(10);
  ramp[baseIndex] = baseHex.toUpperCase();

  for (let i = baseIndex - 1; i >= 0; i--) {
    const t = (baseIndex - i) / baseIndex;
    const newL = l + (lightTargetL - l) * t;
    const newS = s * (1 - desatLight * t);
    ramp[i] = rgbToHex(hslToRgb([h, newS, newL]));
  }

  const remaining = 9 - baseIndex;
  for (let i = baseIndex + 1; i < 10; i++) {
    const t = (i - baseIndex) / remaining;
    const newL = l + (darkTargetL - l) * t;
    const newS = Math.min(1, s * (1 + desatDarkBoost * t));
    ramp[i] = rgbToHex(hslToRgb([h, newS, newL]));
  }

  return ramp as unknown as MantineColorsTuple;
}

/** A low-saturation neutral ramp for dark-mode surfaces, in the given hue. */
function buildNeutralRamp(hueDeg: number, saturation: number): MantineColorsTuple {
  const lights = [0.82, 0.72, 0.62, 0.48, 0.34, 0.26, 0.19, 0.13, 0.1, 0.07];
  return lights.map((l) => rgbToHex(hslToRgb([hueDeg, saturation, l]))) as unknown as MantineColorsTuple;
}

const brand = buildRamp(themeConfig.brand);
const red = buildRamp(themeConfig.red);
const yellow = buildRamp(themeConfig.yellow);

// Dark-mode surfaces share the brand color's hue (desaturated) so dark mode
// reads as an intentional variant of the brand, not a generic gray theme.
const [brandHue] = rgbToHsl(hexToRgb(themeConfig.brand));
const dark = buildNeutralRamp(brandHue, 0.12);

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 4 },
  autoContrast: true,
  white: themeConfig.surface,
  fontFamily: themeConfig.fontFamily,
  defaultRadius: themeConfig.defaultRadius,
  colors: {
    brand,
    red,
    yellow,
    dark,
  },
  components: {
    Table: Table.extend({ defaultProps: { striped: true, highlightOnHover: true } }),
    Modal: Modal.extend({
      defaultProps: { radius: "md", overlayProps: { backgroundOpacity: 0.55, blur: 3 } },
    }),
    Paper: Paper.extend({ defaultProps: { withBorder: true, radius: "md" } }),
    Card: Card.extend({ defaultProps: { withBorder: true, radius: "md" } }),
  },
});

// Mantine derives --mantine-color-body from --mantine-color-white by default, which
// would make the page canvas match every input/dropdown (both read "white") — pinning
// body back to the page background here keeps that distinction in light mode. Dark
// mode already gets it for free from the generated `dark` ramp (body/default/border
// sit at different, well-separated lightness steps), so it's left alone.
//
// --surface-card-bg is for the rare card/surface that needs to visibly stand out from
// the page even though Paper/Card default to matching it (Mantine's own convention,
// relying on a border for separation instead) — e.g. CoalitionsPage's per-row cards.
// Only needed in light mode, where the page and Paper/Card share one flat background;
// in dark mode the generated ramp already gives Paper/Card enough of its own definition.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-body": themeConfig.background,
    "--surface-card-bg": themeConfig.surface,
  },
  dark: {
    "--surface-card-bg": "var(--mantine-color-body)",
  },
});
