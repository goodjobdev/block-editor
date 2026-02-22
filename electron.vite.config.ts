import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        // Silence "Module has been externalized for browser compatibility" warnings.
        // PostCSS (pulled in by @wordpress/components) imports these Node built-ins
        // but never actually calls them in a browser runtime context.
        'path': resolve(__dirname, 'src/renderer/stubs/node.ts'),
        'fs': resolve(__dirname, 'src/renderer/stubs/node.ts'),
        'source-map-js': resolve(__dirname, 'src/renderer/stubs/node.ts')
      }
    },
    optimizeDeps: {
      // Force esbuild to pre-bundle these CJS packages into ESM for dev mode.
      // Without this, "require is not defined" errors appear at runtime.
      esbuildOptions: {
        plugins: []
      },
      include: [
        '@wordpress/block-editor',
        '@wordpress/blocks',
        '@wordpress/block-library',
        '@wordpress/components',
        '@wordpress/data',
        '@wordpress/rich-text',
        '@wordpress/format-library',
        '@wordpress/hooks',
        '@wordpress/i18n',
        '@wordpress/icons',
        '@wordpress/element',
        '@wordpress/compose',
        '@wordpress/keycodes',
        '@wordpress/primitives',
        '@wordpress/a11y',
        '@wordpress/dom',
        '@wordpress/notices',
        '@wordpress/redux-routine',
        'rungen',
        'lodash',
        'react',
        'react-dom'
      ]
    },
    build: {
      commonjsOptions: {
        // Include all of node_modules so Rollup's CJS plugin can bridge CJS
        // imports from within ESM files (e.g. @wordpress/compose importing
        // react/jsx-runtime, which is CJS).
        include: [/node_modules/],
        transformMixedEsModules: true
      },
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})
