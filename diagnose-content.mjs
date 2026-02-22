import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9345', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9345', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}

const page = (await browser.pages()).find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

const consoleLogs = []
page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text().slice(0, 200)}`))

// Find "Content Test"
const allItems = await page.$$('.page-item')
console.log('Page items:', allItems.length)
for (const item of allItems) {
  const t = await item.$eval('.page-item__title', el => el.textContent).catch(() => '?')
  console.log(' -', t)
}

let contentItem = null
for (const item of allItems) {
  const t = await item.$eval('.page-item__title', el => el.textContent).catch(() => '')
  if (t.includes('Content Test')) { contentItem = item; break }
}

if (contentItem) {
  console.log('\nOpening Content Test...')
  await contentItem.click()
  await new Promise(r => setTimeout(r, 5000))

  // Print console logs
  console.log('\n=== CONSOLE LOGS ===')
  consoleLogs.forEach(l => { if (l.includes('[EditorView]') || l.includes('error') || l.includes('Error')) console.log(l) })

  // Check iframe
  const frames = page.frames()
  console.log('\nTotal frames:', frames.length)
  const editorFrame = frames.find(f => f.url() !== page.url())

  if (editorFrame) {
    const info = await editorFrame.evaluate(() => {
      const blocks = document.querySelectorAll('.wp-block-heading, .wp-block-paragraph, [contenteditable="true"]')
      const bodyText = document.body.innerText
      return {
        bodyText: bodyText.slice(0, 300),
        blockCount: document.querySelectorAll('[class*="wp-block"]').length,
        specificBlocks: [...blocks].map(b => ({
          tag: b.tagName,
          cls: b.className.slice(0, 40),
          text: b.textContent?.slice(0, 50),
          visible: b.offsetHeight > 0 && b.offsetWidth > 0,
          height: b.offsetHeight,
        })),
      }
    })
    console.log('\n=== IFRAME STATE ===')
    console.log('Body text:', info.bodyText)
    console.log('Total wp-block elements:', info.blockCount)
    console.log('Specific blocks:', JSON.stringify(info.specificBlocks, null, 2))
  }

  await page.screenshot({ path: join(__dirname, 'diagnose-content.png') })
  console.log('\nScreenshot: diagnose-content.png')
} else {
  console.log('Content Test not found!')
  await page.screenshot({ path: join(__dirname, 'diagnose-content.png') })
}

proc.kill()
process.exit(0)
