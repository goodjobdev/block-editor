import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9342', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9342', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}

const page = (await browser.pages()).find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

// Capture console messages
const consoleLogs = []
page.on('console', msg => {
  const text = msg.text()
  if (text.includes('[EditorView]') || text.includes('parse') || text.includes('block')) {
    consoleLogs.push(`[${msg.type()}] ${text.slice(0, 300)}`)
  }
})

// Find John Test
const allItems = await page.$$('.page-item')
console.log('Found', allItems.length, 'page items')
let johnItem = null
for (const item of allItems) {
  const text = await item.$eval('.page-item__title', el => el.textContent).catch(() => '')
  console.log(' Item:', text)
  if (text.includes('John Test')) { johnItem = item; break }
}

if (!johnItem) {
  console.log('John Test not found! Clicking first item.')
  johnItem = allItems[0]
}

await johnItem.click()
await new Promise(r => setTimeout(r, 5000))

console.log('\n=== CONSOLE LOGS (filtered) ===')
consoleLogs.forEach(l => console.log(l))

// Check iframe state
const frames = page.frames()
console.log('\nTotal frames:', frames.length)
const editorFrame = frames.find(f => f.url() !== page.url())

if (editorFrame) {
  const state = await editorFrame.evaluate(() => {
    const wpBlocks = document.querySelectorAll('[class*="wp-block"]:not(.block-list-appender)')
    const paragraphs = document.querySelectorAll('p')
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const editables = document.querySelectorAll('[contenteditable="true"]')
    return {
      bodyText: document.body.innerText.slice(0, 300),
      wpBlockCount: wpBlocks.length,
      paragraphCount: paragraphs.length,
      headingCount: headings.length,
      editableCount: editables.length,
      editableTexts: [...editables].map(e => e.textContent.slice(0, 50)),
      bodyHTML: document.body.innerHTML.slice(0, 2000),
    }
  })
  console.log('\n=== IFRAME STATE ===')
  console.log('Body text:', state.bodyText)
  console.log('wp-block elements:', state.wpBlockCount)
  console.log('Paragraphs:', state.paragraphCount)
  console.log('Headings:', state.headingCount)
  console.log('Editables:', state.editableCount, state.editableTexts)
  if (state.wpBlockCount === 0) {
    console.log('\nBODY HTML (first 2000):')
    console.log(state.bodyHTML)
  }
} else {
  console.log('NO EDITOR FRAME FOUND')
}

// Also get the editor header title
const title = await page.$eval('.editor-header__title', el => el.value).catch(() => 'not found')
console.log('\nEditor title:', title)

// Check list view
const listViewBtn = await page.$('.editor-header__list-view-btn')
if (listViewBtn) {
  await listViewBtn.click()
  await new Promise(r => setTimeout(r, 500))
  const listItems = await page.$$('.block-editor-list-view-leaf')
  console.log('List view items:', listItems.length)
  for (const item of listItems.slice(0, 5)) {
    const t = await item.evaluate(el => el.textContent?.trim().slice(0, 60))
    console.log(' -', t)
  }
}

await page.screenshot({ path: join(__dirname, 'diagnose-john.png') })
proc.kill()
process.exit(0)
