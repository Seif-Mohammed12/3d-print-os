/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: 'hsl(var(--brand))',
        chart: {
          DEFAULT: 'hsl(var(--chart))',
          muted: 'hsl(var(--chart-muted))',
        },
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
          'draft-soft': 'hsl(var(--stock-draft-soft))',
          'draft-ink': 'hsl(var(--stock-draft-ink))',
          quoted: 'hsl(var(--stock-quoted))',
          'quoted-soft': 'hsl(var(--stock-quoted-soft))',
          'quoted-ink': 'hsl(var(--stock-quoted-ink))',
          approved: 'hsl(var(--stock-approved))',
          'approved-soft': 'hsl(var(--stock-approved-soft))',
          'approved-ink': 'hsl(var(--stock-approved-ink))',
          printing: 'hsl(var(--stock-printing))',
          'printing-soft': 'hsl(var(--stock-printing-soft))',
          'printing-ink': 'hsl(var(--stock-printing-ink))',
          qc: 'hsl(var(--stock-qc))',
          'qc-soft': 'hsl(var(--stock-qc-soft))',
          'qc-ink': 'hsl(var(--stock-qc-ink))',
          failed: 'hsl(var(--stock-failed))',
          'failed-soft': 'hsl(var(--stock-failed-soft))',
          'failed-ink': 'hsl(var(--stock-failed-ink))',
          void: 'hsl(var(--stock-void))',
          'void-soft': 'hsl(var(--stock-void-soft))',
          'void-ink': 'hsl(var(--stock-void-ink))',
          done: 'hsl(var(--stock-done))',
          'done-soft': 'hsl(var(--stock-done-soft))',
          'done-ink': 'hsl(var(--stock-done-ink))',
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
        // The fallbacks are the app's scale; the embedded quoter sets these to fit its host page.
        sm: 'var(--radius-sm, 6px)',
        DEFAULT: 'var(--radius-md, 8px)',
        md: 'var(--radius-md, 8px)',
        lg: 'var(--radius)',
        xl: 'var(--radius-xl, 14px)',
        '2xl': 'var(--radius-2xl, 18px)',
        chip: 'var(--radius-chip, 9999px)',
      },
      boxShadow: {
        // Resting cards get a hairline and the faintest contact shadow; dark mode drops it.
        card: '0 1px 2px rgb(16 24 40 / 0.04)',
        popover: '0 16px 32px -12px rgb(16 24 40 / 0.22), 0 4px 8px -4px rgb(16 24 40 / 0.1)',
      },
    },
  },
  plugins: [],
};
