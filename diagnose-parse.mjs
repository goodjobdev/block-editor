import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
const __dirname = dirname(fileURLToPath(import.meta.url))

// Make sure test page exists
const pagesDir = join(homedir(), 'Library/Application Support/block-editor/pages')
mkdirSync(pagesDir, { recursive: true })

const testPage = {
  id: 'test-parse-001',
  title: 'Parse Test',
  slug: 'parse-test',
  content: `<!-- wp:heading -->
<h2 class="wp-block-heading">Hello Visible World</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>This is a paragraph block.</p>
<!-- /wp:paragraph -->`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
writeFileSync(join(pagesDir, 'test-parse-001.json'), JSON.stringify(testPage, null, 2))
console.log('Created test page file')

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9340', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9340', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}

const pages = await browser.pages()
const page = pages.find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

// Check parse() works in the renderer context
const parseTest = await page.evaluate(() => {
  if (typeof window.wp === 'undefined' || !window.wp?.blocks?.parse) {
    // Try direct import - may not be globally exposed
    return { error: 'wp.blocks.parse not available globally' }
  }
  const content = `<!-- wp:heading -->
<h2 class="wp-block-heading">Hello Visible World</h2>
<!-- /wp:heading -->`
  const blocks = window.wp.blocks.parse(content)
  return { blocks, blockCount: blocks.length }
})
console.log('\n=== PARSE TEST (from renderer context) ===')
console.log(JSON.stringify(parseTest, null, 2))

// Open the test page
const items = await page.$$('.page-item')
console.log('\nPage items found:', items.length)

// Find the parse test item
let parseTestItem = null
for (const item of items) {
  const title = await item.evaluate(el => el.querySelector('.page-item__title')?.textContent)
  if (title?.includes('Parse Test')) {
    parseTestItem = item
    break
  }
}

if (parseTestItem) {
  await parseTestItem.click()
  await new Promise(r => setTimeout(r, 4000))

  // Check React state via devtools or DOM inspection
  const editorState = await page.evaluate(() => {
    // Try to find any React fiber data
    const root = document.getElementById('root')
    const fiberKey = Object.keys(root || {}).find(k => k.startsWith('__reactFiber'))

    // Check the data in the editor header
    const titleEl = document.querySelector('.editor-header__title')
    const titleValue = titleEl?.value

    // Check what the block editor store has
    let storeBlocks = null
    try {
      // Try to access via wp.data if available
      if (window.wp?.data) {
        storeBlocks = window.wp.data.select('core/block-editor').getBlocks()
      }
    } catch (e) {
      storeBlocks = 'error: ' + e.message
    }

    return {
      title: titleValue,
      storeBlocks: storeBlocks ? JSON.stringify(storeBlocks).slice(0, 500) : null,
    }
  })
  console.log('\n=== EDITOR STATE ===')
  console.log(JSON.stringify(editorState, null, 2))

  // Check the iframe
  await new Promise(r => setTimeout(r, 1000))
  const frames = page.frames()
  const editorFrame = frames.find(f => f.url() !== page.url())

  if (editorFrame) {
    const iframeState = await editorFrame.evaluate(() => {
      const bodyText = document.body.innerText
      const blockEls = document.querySelectorAll('[class*="wp-block"]')
      return {
        bodyText: bodyText.slice(0, 200),
        blockCount: blockEls.length,
        blockClasses: [...blockEls].map(el => el.className.slice(0, 60)),
        htmlLength: document.body.innerHTML.length,
      }
    })
    console.log('\n=== IFRAME STATE ===')
    console.log(JSON.stringify(iframeState, null, 2))
  }

  // Also check if blocks are visible in list view by opening it
  const listViewBtn = await page.$('.editor-header__list-view-btn')
  if (listViewBtn) {
    await listViewBtn.click()
    await new Promise(r => setTimeout(r, 500))
    const listViewItems = await page.$$('.block-editor-list-view-leaf')
    console.log('\nList view items:', listViewItems.length)
    for (const item of listViewItems) {
      const text = await item.evaluate(el => el.textContent?.trim())
      console.log(' -', text?.slice(0, 80))
    }
  }
}

await page.screenshot({ path: join(__dirname, 'diagnose-parse.png') })
proc.kill()
process.exit(0)
