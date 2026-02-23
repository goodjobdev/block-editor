# Block Editor — Project Context for Claude

## What We Built

A standalone Gutenberg block editor desktop app using Electron. It strips everything from WordPress except the editor itself:
- Full Gutenberg block editor (BlockEditorProvider + BlockCanvas + BlockInspector)
- All core blocks registered via `registerCoreBlocks()`
- Block patterns (passed via `__experimentalBlockPatterns` settings)
- New page-list UI (CRUD) separate from WordPress admin
- JSON file storage per page in `~/Library/Application Support/block-editor/pages/`
- Electron IPC for all file I/O (no HTTP server)
- Auto-save debounced 1500ms, flush on Cmd+S

## Tech Stack

- **Electron 33** + **electron-vite 5** + **Vite 6**
- **React 18** (pinned — @wordpress requires ^18, not 19)
- **TypeScript** with separate tsconfigs for main/preload/renderer
- **`"type": "module"`** in package.json → ESM output for main/preload

## Project Structure

```
src/
├── main/index.ts          — Electron main process, all IPC handlers
├── preload/index.ts       — contextBridge (exposes electronAPI to renderer)
├── shared/page.ts         — Page/PageMeta types shared by main+renderer
└── renderer/
    ├── index.html         — HTML entry, CSP meta tag
    └── src/
        ├── main.tsx       — registerCoreBlocks() + ReactDOM.createRoot()
        ├── App.tsx        — State router: list | editor
        ├── env.d.ts       — window.electronAPI type declarations
        ├── types/page.ts  — re-exports from shared/
        ├── styles/globals.css
        ├── lib/
        │   ├── useAutoSave.ts
        │   └── mediaUpload.ts   — addFilter('editor.MediaUpload', ...)
        ├── blocks/patterns.ts   — BLOCK_PATTERNS + PATTERN_CATEGORIES data
        └── views/
            ├── PageList/        — page list CRUD view
            └── Editor/          — BlockEditorProvider layout
```

## Build Outputs

- `out/main/index.js` — ESM (because `"type": "module"` in package.json)
- `out/preload/index.mjs` — ESM (explicit .mjs from electron-vite)
- `out/renderer/` — Vite-bundled React app

## Critical Configuration Decisions

### `"type": "module"` in package.json
Required to make `import { ipcMain } from 'electron'` work as a static ESM import. Without it, `require('electron')` resolves to the npm package string (returns the binary path) instead of the Electron API.

### `ELECTRON_RUN_AS_NODE=` in dev/preview scripts
Claude Code (and any Electron-based parent process) sets `ELECTRON_RUN_AS_NODE=1` in the environment. This puts Electron in Node.js mode — `process.type` becomes `undefined` and the Electron API is inaccessible. The dev script explicitly unsets it:
```json
"dev": "ELECTRON_RUN_AS_NODE= electron-vite dev"
```

### Preload path is `../preload/index.mjs`
With `"type": "module"`, electron-vite outputs the preload as `index.mjs` (not `index.js`). The main process must reference this exact extension.

### No `@wordpress/redux-routine` alias
An earlier alias to the CJS build caused a double-default-export issue (`module.exports = { default: fn }` → `import.default = { default: fn }` instead of `fn`). Remove it. esbuild handles `rungen` named imports fine when both packages are in `optimizeDeps.include`.

### CSP includes `'unsafe-inline'` for scripts
Required for the BlockCanvas iframe to run block scripts (blob: URL inline scripts are blocked otherwise).

## npm Dependency Pinning

```json
"@wordpress/block-editor": "15.12.0"   // exact — 15.13.0 pulls in @wordpress/vips
"@wordpress/block-library": "9.39.0"   // exact — 9.40.0 → upload-media@0.25.0 → vips
"@wordpress/rich-text": "7.39.0"       // exact — see instanceof RichTextData bug below
"overrides": {
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "@wordpress/upload-media": "0.24.0",  // 0.25.0 requires vips (not available)
  "@wordpress/block-editor": "15.12.0",
  "@wordpress/rich-text": "7.39.0"      // force single copy — multiple versions break instanceof checks
}
```
After changing overrides, always run `npm dedupe` to eliminate nested copies.

## @wordpress Package Quirks

### Block Patterns API changed in v15.x
`registerBlockPattern()` / `registerBlockPatternCategory()` were removed from `@wordpress/blocks`.
Use `__experimentalBlockPatterns` and `__experimentalBlockPatternCategories` in `BlockEditorProvider` settings:
```tsx
<BlockEditorProvider settings={{ __experimentalBlockPatterns: BLOCK_PATTERNS, ... }}>
```

### BlockCanvas CSS injection
The canvas renders in an iframe. Parent CSS doesn't reach it. Inject via `?raw` import:
```tsx
import blockLibCSS from '@wordpress/block-library/build-style/style.css?raw'
<BlockCanvas styles={[{ css: blockLibCSS }]} />
```

### `@wordpress/format-library/build-style/style.css` doesn't exist
Don't import it. The format library handles its own styling via JS.

### `instanceof RichTextData` breaks with duplicate package versions (blank canvas bug)
Gutenberg uses `instanceof RichTextData` in `useRichText` to detect pre-parsed rich text values. If `@wordpress/blocks` (which calls `parse()`) uses a different copy of `@wordpress/rich-text` than `@wordpress/block-editor` (which runs `useRichText`), the `instanceof` check fails. This causes `create({ html: richTextDataInstance })` to return `createEmptyValue()` → every block renders blank with a BOM (`\uFEFF`) placeholder.

**Symptom**: Blocks appear in List View but the canvas is blank on reopen. Typing wipes existing content.

**Fix**: Pin `@wordpress/rich-text` to a single version in both `dependencies` and `overrides`, then run `npm dedupe`. Verify with:
```bash
find node_modules -path "*/rich-text/package.json" | xargs grep '"version"'
```
All entries should show the same version with no nested duplicates.

## IPC Channels

| Channel | Args | Returns |
|---|---|---|
| `pages:list` | — | `PageMeta[]` |
| `pages:read` | `id: string` | `Page \| null` |
| `pages:create` | `draft: NewPage` | `Page` |
| `pages:save` | `page: Page` | `Page` (with updated `updatedAt`) |
| `pages:delete` | `id: string` | `void` |

## Known Issues / Dev Mode Console Noise

- **`Store "core/rich-text" is already registered`** — benign, happens because `registerCoreBlocks()` and `@wordpress/format-library` both try to register overlapping stores. No action needed.
- **`Module "path" has been externalized`** — PostCSS (pulled in by `@wordpress/components`) tries to use Node built-ins in the browser. These are warnings, not fatal errors. The app renders fine despite them.

## Running the App

```bash
npm run dev      # dev server (uses ELECTRON_RUN_AS_NODE= to unset env var)
npm run build    # production build → out/
npm run preview  # preview production build
```

## What to Tackle Next

- **Silence the PostCSS browser warnings**: alias `path`/`fs`/`source-map-js` to no-op browser stubs in `electron.vite.config.ts`'s `renderer.resolve.alias`
- **Native media upload dialog**: replace the `window.prompt()` URL stub in `mediaUpload.ts` with a real Electron file-dialog call via `ipcMain.handle('dialog:openFile', ...)`
- **TypeScript strictness**: run `npm run typecheck` and fix any remaining type errors in the wordpress-shims.d.ts declarations
- **Packaging**: test `npm run build` output launches correctly as a packaged .app via `electron-builder`
- **UX polish**: page title editing in the list view, keyboard shortcuts for navigation, better empty state
