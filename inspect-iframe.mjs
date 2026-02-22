import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9337', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9337', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}
const pages = await browser.pages()
const page = pages.find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

// Create page, type heading content, save, go back
await page.$('.page-list-view__new-btn').then(b => b.click())
await new Promise(r => setTimeout(r, 2500))

// Change title
const titleInput = await page.$('.editor-header__title')
await titleInput.click({ clickCount: 3 })
await titleInput.type('Inspect Test')

// Type content into the iframe
const frames = page.frames()
const editorFrame = frames.find(f => f.url() !== page.url())
if (editorFrame) {
  await editorFrame.click('body')
  await new Promise(r => setTimeout(r, 300))
  await page.keyboard.type('My Test Heading')
}
await new Promise(r => setTimeout(r, 500))

// Save
await page.$('.editor-header__save-btn').then(b => b.click())
await new Promise(r => setTimeout(r, 2000))

// Go back
await page.$('.editor-header__back').then(b => b.click())
await new Promise(r => setTimeout(r, 1500))

// Reopen the page
await page.$('.page-item').then(b => b.click())
await new Promise(r => setTimeout(r, 3000))

// Now inspect the iframe state
const frames2 = page.frames()
const editorFrame2 = frames2.find(f => f.url() !== page.url())
if (editorFrame2) {
  const bodyHTML = await editorFrame2.evaluate(() => document.body.innerHTML.slice(0, 2000))
  console.log('\n=== IFRAME BODY HTML ===')
  console.log(bodyHTML)

  const bodyText = await editorFrame2.evaluate(() => document.body.innerText)
  console.log('\n=== IFRAME BODY TEXT ===')
  console.log(JSON.stringify(bodyText))

  // Check if content editables are present
  const editables = await editorFrame2.evaluate(() => {
    const els = document.querySelectorAll('[contenteditable]')
    return [...els].map(el => ({
      tag: el.tagName,
      text: el.textContent,
      visible: el.offsetParent !== null,
      style: window.getComputedStyle(el).color + ' / visibility:' + window.getComputedStyle(el).visibility + ' / display:' + window.getComputedStyle(el).display
    }))
  })
  console.log('\n=== CONTENTEDITABLE ELEMENTS ===')
  console.log(JSON.stringify(editables, null, 2))
}

// Check what blocks are in the store via React state
const blockCount = await page.evaluate(() => {
  // Try to find block data via the editor
  const items = document.querySelectorAll('.block-editor-list-view-leaf')
  return items.length
})
console.log('\n=== LIST VIEW ITEMS ===', blockCount)

await page.screenshot({ path: join(__dirname, 'inspect-reopen.png') })

proc.kill()
process.exit(0)
