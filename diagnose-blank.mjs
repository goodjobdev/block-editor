import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9338', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9338', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}
const pages = await browser.pages()
const page = pages.find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

// Step 1: Create new page and type a heading
console.log('Creating page...')
await page.$('.page-list-view__new-btn').then(b => b.click())
await new Promise(r => setTimeout(r, 2500))

// Set title
const titleInput = await page.$('.editor-header__title')
await titleInput.click({ clickCount: 3 })
await titleInput.type('Blank Canvas Test')

// Wait for iframe to be ready
await new Promise(r => setTimeout(r, 1000))
const frames = page.frames()
const editorFrame = frames.find(f => f.url() !== page.url())
console.log('Editor frame URL:', editorFrame?.url()?.slice(0, 60))

if (editorFrame) {
  // Click in the frame and type
  await editorFrame.click('body')
  await new Promise(r => setTimeout(r, 300))
  await page.keyboard.type('Hello Heading World')
  await new Promise(r => setTimeout(r, 500))

  // Check what's in the iframe
  const headingInfo = await editorFrame.evaluate(() => {
    const headings = document.querySelectorAll('[contenteditable], .wp-block-heading, h1, h2, h3, h4, h5, h6')
    return [...headings].map(el => ({
      tag: el.tagName,
      cls: el.className.slice(0, 60),
      text: el.textContent?.slice(0, 50),
      color: window.getComputedStyle(el).color,
      bg: window.getComputedStyle(el).backgroundColor,
      display: window.getComputedStyle(el).display,
      visibility: window.getComputedStyle(el).visibility,
      opacity: window.getComputedStyle(el).opacity,
      height: el.offsetHeight,
      width: el.offsetWidth,
    }))
  })
  console.log('\n=== IFRAME ELEMENTS BEFORE SAVE ===')
  console.log(JSON.stringify(headingInfo, null, 2))
}

// Save and go back
await page.$('.editor-header__save-btn').then(b => b.click())
await new Promise(r => setTimeout(r, 2000))
await page.$('.editor-header__back').then(b => b.click())
await new Promise(r => setTimeout(r, 2000))

// Reopen the page
await page.$('.page-item').then(b => b.click())
await new Promise(r => setTimeout(r, 4000))

// Now check the canvas
const frames2 = page.frames()
const editorFrame2 = frames2.find(f => f.url() !== page.url())
console.log('\nAfter reopen - frame URL:', editorFrame2?.url()?.slice(0, 60))
console.log('Total frames:', frames2.length)

if (editorFrame2) {
  const headingInfo2 = await editorFrame2.evaluate(() => {
    const all = document.querySelectorAll('*')
    const results = []
    for (const el of all) {
      if (el.textContent?.includes('Hello')) {
        const style = window.getComputedStyle(el)
        results.push({
          tag: el.tagName,
          cls: el.className?.slice?.(0, 60),
          text: el.textContent?.slice(0, 80),
          color: style.color,
          bg: style.backgroundColor,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          height: el.offsetHeight,
          width: el.offsetWidth,
          zIndex: style.zIndex,
          position: style.position,
        })
      }
    }
    return results
  })

  console.log('\n=== ELEMENTS WITH "Hello" AFTER REOPEN ===')
  if (headingInfo2.length === 0) {
    console.log('No elements found with "Hello" text!')
    const bodyHTML = await editorFrame2.evaluate(() => document.body.innerHTML.slice(0, 2000))
    console.log('\n=== IFRAME BODY HTML ===')
    console.log(bodyHTML)
  } else {
    console.log(JSON.stringify(headingInfo2, null, 2))
  }
} else {
  console.log('No editor frame found after reopen!')
  // Check if iframe exists in DOM
  const iframeInfo = await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe')
    return [...iframes].map(f => ({ src: f.src?.slice(0, 80), name: f.name, display: window.getComputedStyle(f).display }))
  })
  console.log('Iframes in parent:', JSON.stringify(iframeInfo, null, 2))
}

await page.screenshot({ path: join(__dirname, 'diagnose-blank.png') })

proc.kill()
process.exit(0)
