import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ], 
  theme: {
    extend: {
        colors: {
            // shadcn/ui colors
            'background': 'hsl(var(--background))',
            'foreground': 'hsl(var(--foreground))',
            'card': 'hsl(var(--card))',
            'card-foreground': 'hsl(var(--card-foreground))',
            'popover': 'hsl(var(--popover))',
            'popover-foreground': 'hsl(var(--popover-foreground))',
            'muted': 'hsl(var(--muted))',
            'muted-foreground': 'hsl(var(--muted-foreground))',
            'accent': 'hsl(var(--accent))',
            'accent-foreground': 'hsl(var(--accent-foreground))',
            'destructive': 'hsl(var(--destructive))',
            'destructive-foreground': 'hsl(var(--destructive-foreground))',
            'border': 'hsl(var(--border))',
            'input': 'hsl(var(--input))',
            'ring': 'hsl(var(--ring))',
            'primary': 'hsl(var(--primary))',
            'primary-foreground': 'hsl(var(--primary-foreground))',
            'secondary': 'hsl(var(--secondary))',
            'secondary-foreground': 'hsl(var(--secondary-foreground))',
            // Custom paper design tokens
            'bg-base': 'var(--background)',
            'text-base': 'var(--foreground)',
            'border-base': 'var(--border-color)',
            'paper-base': 'var(--paper-base)',
            'paper-panel': 'var(--paper-panel)',
            'paper-border': 'var(--paper-border)',
            'green-primary': 'hsl(var(--green-primary))',
            'green-hover': 'hsl(var(--green-hover))',
            'green-text': 'hsl(var(--green-text))',
            'orange-muted': 'hsl(var(--orange-muted))',
            'orange-hover': 'hsl(var(--orange-hover))',
            'orange-text': 'hsl(var(--orange-text))',
        },
        animation: {
            blob: 'blob 7s infinite',
            float: 'float 3s ease-in-out infinite',
            'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            shimmer: 'shimmer 2s infinite',
            'slide-up': 'slide-up 0.5s ease-out',
            'scale-in': 'scale-in 0.3s ease-out',
        },
        keyframes: {
            blob: {
                '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
            },
            float: {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-10px)' },
            },
            'pulse-glow': {
                '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
                '50%': { boxShadow: '0 0 30px rgba(236, 72, 153, 0.5)' },
            },
            shimmer: {
                '0%': { backgroundPosition: '-1000px 0' },
                '100%': { backgroundPosition: '1000px 0' },
            },
            'slide-up': {
                'from': {
                    opacity: '0',
                    transform: 'translateY(20px)',
                },
                'to': {
                    opacity: '1',
                    transform: 'translateY(0)',
                },
            },
            'scale-in': {
                'from': {
                    opacity: '0',
                    transform: 'scale(0.95)',
                },
                'to': {
                    opacity: '1',
                    transform: 'scale(1)',
                },
            },
        },
    },
  },
  plugins: [],
}
export default config
