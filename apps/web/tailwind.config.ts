import type { Config } from 'tailwindcss';

// MUR Coaching tokens (docs/DESIGN_OVERHAUL_SPEC.md §1).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '6px',
      md: '8px',
      lg: '12px',
      full: '9999px',
    },
    extend: {
      colors: {
        canvas: '#0B0B0C',
        'canvas-low': '#0F0F11',
        card: '#131315',
        raised: '#1A1A1D',
        line: '#232327',
        'line-strong': '#323238',
        ink: '#ECEBE7',
        muted: '#8B8B91',
        faint: '#5D5D64',
        primary: { DEFAULT: '#ECEBE7', ink: '#0B0B0C', container: '#1E1E21', soft: '#FFFFFF' },
        signal: { DEFAULT: '#FF6A1F', bg: '#2A1408' },
        danger: { DEFAULT: '#F2554C', bg: '#2A0F0E' },
        emerald: { DEFAULT: '#4FBF7F', bg: '#0E2218' },
        sky: { DEFAULT: '#6AA4E6', bg: '#0E1A2A' },
        amber: { DEFAULT: '#D6A23E', bg: '#251B09' },
        rose: { DEFAULT: '#E5615A', bg: '#2A1110' },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        micro: ['10.5px', { lineHeight: '14px', letterSpacing: '0.06em' }],
        meta: ['12px', { lineHeight: '16px' }],
        ui: ['13px', { lineHeight: '18px' }],
        body: ['15px', { lineHeight: '22px' }],
        title: ['17px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
        h2: ['22px', { lineHeight: '26px', letterSpacing: '-0.015em' }],
        h1: ['30px', { lineHeight: '32px', letterSpacing: '-0.025em' }],
        display: ['clamp(40px, 6vw, 76px)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
        metric: ['28px', { lineHeight: '30px', letterSpacing: '-0.02em' }],
        'metric-lg': ['44px', { lineHeight: '44px', letterSpacing: '-0.03em' }],
      },
      spacing: { topbar: '56px', sidebar: '232px', drawer: '560px' },
      transitionDuration: { DEFAULT: '150ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)' },
    },
  },
  plugins: [],
};

export default config;
