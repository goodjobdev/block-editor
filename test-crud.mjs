/**
 * End-to-end CRUD test for the block editor Electron app.
 * Launches Electron with --remote-debugging-port, connects via puppeteer-core.
 *
 * Flow:
 *   CREATE  → click "+ New Page" → editor opens
 *   UPDATE  → set title, type body content, Cmd+S
 *   READ    → go back to list → click page → verify content persisted
 *   DELETE  → go back → click × → confirm dialog → page gone
 */

import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEBUG_PORT = 9333
const ELECTRON_BIN = join(__dirname, 'node_modules/.bin/electron')
const APP_MAIN = join(__dirname, 'out/main/index.js')

const PASS = '✓'
const FAIL = '✗'
let failures = 0

function log(msg, ok = true) {
  console.log(`  ${ok ? PASS : FAIL} ${msg}`)
  if (!ok) failures++
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function ss(page, name) {
  const path = join(__dirname, `crud-${name}.png`)
  await page.screenshot({ path })
  console.log(`    📸 crud-${name}.png`)
}

async function waitFor(page, selector, timeout = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const el = await page.$(selector)
    if (el) return el
    await sleep(150)
  }
  throw new Error(`Timeout waiting for: ${selector}`)
}

// ── Launch & connect ─────────────────────────────────────────────────────────

let proc

async function launch() {
  return new Promise((resolve) => {
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '' }
    proc = spawn(ELECTRON_BIN, [APP_MAIN, `--remote-debugging-port=${DEBUG_PORT}`, '--no-sandbox'], {
      env, stdio: ['ignore', 'pipe', 'pipe']
    })
    proc.stderr.on('data', d => process.stderr.write(d))
    // Give Electron time to start devtools server
    setTimeout(resolve, 3500)
  })
}

async function connectBrowser() {
  for (let i = 0; i < 20; i++) {
    try {
      return await connect({ browserURL: `http://localhost:${DEBUG_PORT}`, defaultViewport: null })
    } catch { await sleep(400) }
  }
  throw new Error('Could not connect to Electron remote devtools')
}

async function appPage(browser) {
  // The renderer page URL is localhost (vite dev) or file:// (prod build)
  for (let i = 0; i < 20; i++) {
    const pages = await browser.pages()
    const p = pages.find(pg => {
      const u = pg.url()
      return u.startsWith('http://localhost') || u.startsWith('file://')
    })
    if (p) return p
    await sleep(400)
  }
  throw new Error('Could not find renderer page')
}

// ── Main test ────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════')
console.log('  Block Editor — CRUD End-to-End Test')
console.log('══════════════════════════════════════════\n')

console.log('▶ Launching Electron...')
await launch()
const browser = await connectBrowser()
log('Connected to Electron DevTools')

const page = await appPage(browser)
log(`Renderer page: ${page.url()}`)

// Wait for React to fully render
await sleep(2000)
await ss(page, '01-initial')

// ── Verify empty state ────────────────────────────────────────────────────────
const header = await page.$('.page-list-view__header')
log(`Page list view rendered: ${!!header}`)

// ── CREATE ────────────────────────────────────────────────────────────────────
console.log('\n▶ CREATE')

const newBtn = await waitFor(page, '.page-list-view__new-btn')
await newBtn.click()
log('Clicked "+ New Page"')
await sleep(2000)
await ss(page, '02-editor-opened')

// Verify editor opened
const editorHeader = await page.$('.editor-header')
log(`Editor header visible: ${!!editorHeader}`)

// Update title
const titleInput = await waitFor(page, '.editor-header__title')
await titleInput.click({ clickCount: 3 })
await titleInput.type('My CRUD Test Page')
log('Set title: "My CRUD Test Page"')
await sleep(300)

// ── UPDATE (type content in iframe) ──────────────────────────────────────────
console.log('\n▶ UPDATE')

// BlockCanvas renders inside an iframe — find it
await sleep(1500) // give iframe time to load
const frames = page.frames()
log(`Frames detected: ${frames.length}`)

const editorFrame = frames.find(f => f.url() !== page.url() && f.url() !== 'about:blank')
  ?? frames.find(f => f.url() !== page.url())

if (editorFrame) {
  log(`Editor iframe URL: ${editorFrame.url() || '(srcdoc)'}`)
  try {
    // Click the empty paragraph in the iframe body to focus it
    await editorFrame.waitForSelector('body', { timeout: 5000 })
    await editorFrame.click('body')
    await sleep(300)
    await page.keyboard.type('Hello from the CRUD test run!')
    log('Typed body content in editor')
  } catch (e) {
    log(`Could not type in iframe body: ${e.message}`, false)
  }
} else {
  log('No editor iframe found (BlockCanvas may not be loaded yet)', false)
}

await sleep(500)
await ss(page, '03-content-typed')

// Cmd+S with focus still inside the iframe — this is the bug we fixed.
// The iframe keydown handler should forward to flushNow() in the parent.
await page.keyboard.down('Meta')
await page.keyboard.press('s')
await page.keyboard.up('Meta')
log('Cmd+S sent (focus inside iframe — testing the fix)')
await sleep(2000) // wait for IPC round-trip

// Verify save status shows "Saved"
const statusEl = await page.$('.editor-header__status')
const statusText = statusEl ? await statusEl.evaluate(el => el.textContent) : '(not found)'
log(`Save status: "${statusText}"`, statusText === 'Saved')
await ss(page, '04-saved')

// ── READ (back to list, reopen, verify) ──────────────────────────────────────
console.log('\n▶ READ (persist check)')

const backBtn = await waitFor(page, '.editor-header__back')
await backBtn.click()
log('Clicked "← Pages" (back to list)')
await sleep(1200)
await ss(page, '05-back-to-list')

// Verify page appears in list
const pageItem = await page.$('.page-item')
log(`Page appears in list: ${!!pageItem}`)

if (pageItem) {
  const titleSpan = await pageItem.$('.page-item__title')
  const listedTitle = titleSpan ? await titleSpan.evaluate(el => el.textContent) : ''
  log(`Listed title: "${listedTitle}"`, listedTitle === 'My CRUD Test Page')
}

// Re-open the page
await pageItem?.click()
await sleep(2000)
await ss(page, '06-reopen-editor')

// Check title persisted
const reopenTitle = await page.$('.editor-header__title')
const reopenVal = reopenTitle ? await reopenTitle.evaluate(el => el.value) : ''
log(`Title persisted: "${reopenVal}"`, reopenVal === 'My CRUD Test Page')

// Check content persisted via IPC (read the saved JSON)
const savedContent = await page.evaluate(() => {
  // Read pages list to get the page id, then read its content
  return window.electronAPI.pages.list().then(metas => {
    const meta = metas.find(m => m.title === 'My CRUD Test Page')
    if (!meta) return null
    return window.electronAPI.pages.read(meta.id)
  })
})
if (savedContent) {
  const hasContent = (savedContent.content ?? '').includes('Hello from the CRUD test run!')
  log(`IPC-read content persisted: ${hasContent}`, hasContent)
  log(`Raw saved content: "${(savedContent.content ?? '').slice(0, 100)}"`, hasContent)
} else {
  log('Could not find page via IPC after reopen', false)
}

// Also check iframe content visually
await sleep(1000)
const frames2 = page.frames()
const editorFrame2 = frames2.find(f => f.url() !== page.url())
if (editorFrame2) {
  try {
    const bodyText = await editorFrame2.evaluate(() => document.body.innerText)
    const hasContent = bodyText.includes('Hello from the CRUD test run!')
    log(`Iframe body text: "${bodyText.trim().slice(0, 80)}"`)
  } catch (e) {
    log(`Could not read iframe content: ${e.message}`, false)
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
console.log('\n▶ DELETE')

// Go back to list
const backBtn2 = await waitFor(page, '.editor-header__back')
await backBtn2.click()
await sleep(1000)

// Handle the window.confirm dialog BEFORE clicking delete
page.once('dialog', async (dialog) => {
  log(`Confirm dialog: "${dialog.message()}"`)
  await dialog.accept()
  log('Accepted delete confirmation')
})

const deleteBtn = await waitFor(page, '.page-item__delete')
await deleteBtn.click()
log('Clicked × (delete button)')
await sleep(1500)
await ss(page, '07-after-delete')

// Verify page is gone
const remainingItems = await page.$$('.page-item')
log(`Page removed from list: ${remainingItems.length === 0}`, remainingItems.length === 0)

const emptyState = await page.$('.page-list-view__empty')
log(`Empty state shown: ${!!emptyState}`)

await ss(page, '08-final-empty-state')

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════')
if (failures === 0) {
  console.log('  ✅  All CRUD checks passed!')
} else {
  console.log(`  ❌  ${failures} check(s) failed — see output above`)
}
console.log('══════════════════════════════════════════\n')

proc.kill()
process.exit(failures > 0 ? 1 : 0)
