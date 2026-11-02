/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        chart: 'hsl(var(--chart))',
        rack: 'hsl(var(--rack))',
        slot: 'hsl(var(--slot))',
        'slot-hi': 'hsl(var(--slot-hi))',
        rule: 'hsl(var(--rule))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          raised: 'hsl(var(--sidebar-raised))',
          active: 'hsl(var(--sidebar-active))',
          'active-foreground': 'hsl(var(--sidebar-active-foreground))',
        },
        stock: {
          draft: 'hsl(var(--stock-draft))',
          quoted: 'hsl(var(--stock-quoted))',
          approved: 'hsl(var(--stock-approved))',
          printing: 'hsl(var(--stock-printing))',
          qc: 'hsl(var(--stock-qc))',
          failed: 'hsl(var(--stock-failed))',
          void: 'hsl(var(--stock-void))',
          done: 'hsl(var(--stock-done))',
          'done-ink': 'hsl(var(--stock-done-ink))',
          ink: 'hsl(var(--stock-ink))',
          edge: 'hsl(var(--stock-edge))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          soft: 'hsl(var(--destructive-soft))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          soft: 'hsl(var(--success-soft))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          soft: 'hsl(var(--warning-soft))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        // The board has square-cut card stock: nothing rounds past 2px except status lamps.
        xl: 'var(--radius)',
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        // Cards sit flat in the rack; only overlays lift off the board.
        card: 'none',
        popover: '0 12px 28px -8px rgb(12 22 30 / 0.35), 0 2px 6px -2px rgb(12 22 30 / 0.2)',
      },
    },
  },
  plugins: [],
};
