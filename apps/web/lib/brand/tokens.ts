/** Brand tokens from PRD section 2.2. Dark theme. Brand colours are fills with white text. */
export const tokens = {
  bg: '#0A0A0A',
  surface: '#171717',
  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  red: '#D32F2F',
  green: '#2E7D32',
  blue: '#1565C0',
  redTint: '#EF5350',
  greenTint: '#66BB6A',
  blueTint: '#42A5F5',
  border: '#2A2A2A',
} as const;

export type TokenName = keyof typeof tokens;

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two #RRGGBB colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
