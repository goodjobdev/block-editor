import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
const __dirname = dirname(fileURLToPath(import.meta.url))

// Pre-create a page with content so we can open it directly
const pagesDir = join(homedir(), 'Library/Application Support/block-editor/pages')
mkdirSync(pagesDir, { recursive: true })

const testPage = {
  id: 'test-visual-001',
  title: 'Visual Test Page',
  slug: 'visual-test-page',
  content: `<!-- wp:heading -->
<h2 class="wp-block-heading">Hello Visible World</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>This is a paragraph block.</p>
<!-- /wp:paragraph -->`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
writeFileSync(join(pagesDir, 'test-visual-001.json'), JSON.stringify(testPage, null, 2))
console.log('Created test page file')

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9339', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9339', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}

const pages = await browser.pages()
const page = pages.find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

// Screenshot page list
await page.screenshot({ path: join(__dirname, 'visual-01-list.png') })
console.log('Page list screenshot taken')

// Click on the test page
const items = await page.$$('.page-item')
console.log('Page items found:', items.length)
if (items.length > 0) {
  await items[0].click()
  await new Promise(r => setTimeout(r, 4000))
  await page.screenshot({ path: join(__dirname, 'visual-02-editor.png') })
  console.log('Editor screenshot taken')

  // Check the iframe
  const frames = page.frames()
  console.log('Frame count:', frames.length)
  const editorFrame = frames.find(f => f.url() !== page.url())

  if (editorFrame) {
    console.log('Editor frame URL:', editorFrame.url().slice(0, 80))

    // Get ALL elements in the iframe
    const allInfo = await editorFrame.evaluate(() => {
      const results = []
      // Check body
      const body = document.body
      const bodyStyle = window.getComputedStyle(body)
      results.push({
        tag: 'BODY',
        cls: body.className,
        text: body.innerText?.slice(0, 100),
        height: body.offsetHeight,
        width: body.offsetWidth,
        color: bodyStyle.color,
        bg: bodyStyle.backgroundColor,
      })

      // Check all block elements
      const blockEls = document.querySelectorAll('.wp-block, [class*="wp-block"], h1, h2, h3, h4, h5, h6, p, [contenteditable]')
      for (const el of blockEls) {
        const style = window.getComputedStyle(el)
        results.push({
          tag: el.tagName,
          cls: el.className?.slice?.(0, 80),
          text: el.textContent?.slice(0, 80),
          html: el.innerHTML?.slice(0, 100),
          color: style.color,
          bg: style.backgroundColor,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          height: el.offsetHeight,
          width: el.offsetWidth,
          scrollHeight: el.scrollHeight,
        })
      }

      return results
    })

    console.log('\n=== IFRAME ELEMENTS ===')
    console.log(JSON.stringify(allInfo, null, 2))

    // Also get the full HTML
    const html = await editorFrame.evaluate(() => document.documentElement.outerHTML.slice(0, 3000))
    console.log('\n=== IFRAME HTML (first 3000 chars) ===')
    console.log(html)
  } else {
    console.log('No editor frame found! Checking iframe DOM in parent:')
    const iframeInfo = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe')
      const canvasWrap = document.querySelector('.editor-canvas-wrap')
      return {
        iframes: [...iframes].map(f => ({
          src: f.src?.slice(0, 80),
          name: f.name,
          display: window.getComputedStyle(f).display,
          height: f.offsetHeight,
          width: f.offsetWidth,
        })),
        canvasWrapHeight: canvasWrap?.offsetHeight,
        canvasWrapWidth: canvasWrap?.offsetWidth,
        canvasWrapHTML: canvasWrap?.innerHTML?.slice(0, 500),
      }
    })
    console.log(JSON.stringify(iframeInfo, null, 2))
  }
}

proc.kill()
process.exit(0)
