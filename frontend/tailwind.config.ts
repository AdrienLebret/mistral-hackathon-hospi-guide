import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './views/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                mistral: {
                    orange: '#FF7000',
                    amber: '#FFB800',
                    'orange-light': '#FF9E44',
                    dark: '#0F172A',
                    card: '#1E293B',
                    'card-hover': '#334155',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}

export default config
