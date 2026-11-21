import type { Config } from 'tailwindcss';

// ApexMetric design tokens (see apexmetric_design_system.md).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0A0C10',
        'canvas-low': '#0F1219',
        card: '#131720',
        raised: '#1A1F2B',
        line: '#222938',
        'line-strong': '#334155',
        ink: '#F8FAFC',
        muted: '#94A3B8',
        primary: { DEFAULT: '#C6FF00', ink: '#0A0C10', container: '#273500', soft: '#D9FF78' },
        danger: { DEFAULT: '#FF5449', bg: '#350B16' },
        emerald: { DEFAULT: '#34D399', bg: '#062E22' },
        sky: { DEFAULT: '#38BDF8', bg: '#082A3F' },
        amber: { DEFAULT: '#FBBF24', bg: '#332005' },
        rose: { DEFAULT: '#FB7185', bg: '#350B16' },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '12px', md: '12px', lg: '16px' },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [],
};

export default config;
