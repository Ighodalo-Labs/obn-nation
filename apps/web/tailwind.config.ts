import type { Config } from 'tailwindcss';
import { tokens } from './lib/brand/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: tokens.bg,
        surface: tokens.surface,
        muted: tokens.textMuted,
        border: tokens.border,
        brand: { red: tokens.red, green: tokens.green, blue: tokens.blue },
        tint: { red: tokens.redTint, green: tokens.greenTint, blue: tokens.blueTint },
      },
      maxWidth: { screen480: '480px' },
      fontFamily: { display: ['"Schibsted Grotesk Variable"', 'system-ui', 'sans-serif'], sans: ['"Schibsted Grotesk Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
