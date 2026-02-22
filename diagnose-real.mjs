import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9343', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9343', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}

const page = (await browser.pages()).find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

// Capture console
const consoleLogs = []
page.on('console', msg => {
  const text = msg.text()
  if (text.includes('[EditorView]')) consoleLogs.push(text)
})

// List all pages
const allItems = await page.$$('.page-item')
console.log('Page items:', allItems.length)
for (const item of allItems) {
  const t = await item.$eval('.page-item__title', el => el.textContent).catch(() => '?')
  console.log(' -', t)
}

// Click first item
if (allItems.length > 0) {
  await allItems[0].click()
  await new Promise(r => setTimeout(r, 5000))

  // Print console logs
  console.log('\n=== EDITOR CONSOLE LOGS ===')
  consoleLogs.forEach(l => console.log(l))

  // Check iframe
  const frames = page.frames()
  const editorFrame = frames.find(f => f.url() !== page.url())
  if (editorFrame) {
    const info = await editorFrame.evaluate(() => {
      const blocks = document.querySelectorAll('[class*="wp-block"]:not(.block-list-appender):not([class*="appender"]):not([class*="inserter"])')
      const editables = document.querySelectorAll('[contenteditable]')
      return {
        blockCount: blocks.length,
        blockInfo: [...blocks].slice(0, 5).map(b => ({
          tag: b.tagName,
          cls: b.className.slice(0, 60),
          text: b.textContent?.slice(0, 50),
          height: b.offsetHeight,
        })),
        editableCount: editables.length,
        editableTexts: [...editables].slice(0, 5).map(e => e.textContent?.slice(0, 50)),
        bodyText: document.body.innerText?.slice(0, 300),
      }
    })
    console.log('\n=== IFRAME BLOCKS ===')
    console.log(JSON.stringify(info, null, 2))
  } else {
    console.log('No iframe found')
  }

  // Screenshot
  await page.screenshot({ path: join(__dirname, 'diagnose-real.png') })
}

proc.kill()
process.exit(0)
