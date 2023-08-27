import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'

import ports from '../../ports.json'

// Create TypeScript defintion files
// TODO: move to @allmaps/stdlib?
const dts: PluginOption = {
  name: 'dts-generator',
  buildEnd: (error) => {
    if (!error) {
      return new Promise((resolve, reject) => {
        exec('npm run build:types', (err) => (err ? reject(err) : resolve()))
      })
    }
  }
}

/** @type {import('vite').UserConfig} */
export default defineConfig({
  server: {
    port: ports.leaflet
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: false,
    // minify: false,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) =>
        `bundled/allmaps-leaflet-1.9.${format}.${
          format === 'umd' ? 'cjs' : 'js'
        }`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['L', 'Layer'],
      output: {
        globals: {
          L: 'L',
          Layer: 'L.Layer'
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: '',
  plugins: [dts]
})
