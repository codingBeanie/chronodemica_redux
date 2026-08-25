/** WCAG relative luminance + contrast ratio, for warning about illegible color pairs. */

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((c) => Number.isNaN(c))) return 1;
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two hex colors, from 1 (identical) to 21 (black/white). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA minimum for normal-size text. */
export const MIN_AA_CONTRAST = 4.5;

/** Picks whichever of white/black reads better against `bgHex` — for text drawn on a user-chosen color. */
export function autoTextColor(bgHex: string): string {
  const whiteRatio = contrastRatio(bgHex, "#FFFFFF");
  const blackRatio = contrastRatio(bgHex, "#000000");
  return whiteRatio >= blackRatio ? "#FFFFFF" : "#000000";
}
