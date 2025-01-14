import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'

// TODO: move to @allmaps/stdlib?
const buildTypes: PluginOption = {
  name: 'build:types',
  buildEnd: (error) => {
    if (!error) {
      return new Promise((resolve, reject) => {
        exec('pnpm run build:types', (err) => (err ? reject(err) : resolve()))
      })
    }
  }
}

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `bundled/index.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['@allmaps/stdlib', '@turf/distance', '@turf/midpoint'],
      output: {
        globals: {
          '@allmaps/stdlib': '@allmaps/stdlib',
          '@turf/distance': '@turf/distance',
          '@turf/midpoint': '@turf/midpoint'
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    }
  },
  base: '',
  plugins: [buildTypes]
})
