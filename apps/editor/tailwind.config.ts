import { theme } from '@allmaps/tailwind'

import type { Config } from 'tailwindcss'

export default {
  mode: 'jit',
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme,
  plugins: []
} satisfies Config
