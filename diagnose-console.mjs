import { connect } from 'puppeteer-core'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
const __dirname = dirname(fileURLToPath(import.meta.url))

const pagesDir = join(homedir(), 'Library/Application Support/block-editor/pages')
mkdirSync(pagesDir, { recursive: true })

const testPage = {
  id: 'test-console-001',
  title: 'Console Test',
  slug: 'console-test',
  content: `<!-- wp:heading -->
<h2 class="wp-block-heading">Hello Visible World</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>This is a paragraph block.</p>
<!-- /wp:paragraph -->`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
writeFileSync(join(pagesDir, 'test-console-001.json'), JSON.stringify(testPage, null, 2))

const proc = spawn(join(__dirname, 'node_modules/.bin/electron'), [
  join(__dirname, 'out/main/index.js'), '--remote-debugging-port=9341', '--no-sandbox'
], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }, stdio: 'ignore' })

await new Promise(r => setTimeout(r, 4000))
let browser
for (let i = 0; i < 20; i++) {
  try { browser = await connect({ browserURL: 'http://localhost:9341', defaultViewport: null }); break }
  catch { await new Promise(r => setTimeout(r, 400)) }
}

const page = (await browser.pages()).find(p => p.url().startsWith('file://'))
await new Promise(r => setTimeout(r, 2000))

// Capture console messages
const consoleLogs = []
page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }))

// Find and click console test item
const allItems = await page.$$('.page-item')
let testItem = null
for (const item of allItems) {
  const text = await item.$eval('.page-item__title', el => el.textContent).catch(() => '')
  if (text.includes('Console Test')) { testItem = item; break }
}

if (testItem) {
  await testItem.click()
  await new Promise(r => setTimeout(r, 5000))

  // Print all console logs
  console.log('\n=== CONSOLE LOGS ===')
  for (const log of consoleLogs) {
    console.log(`[${log.type}]`, log.text.slice(0, 200))
  }

  // Check store state via page.evaluate
  const storeInfo = await page.evaluate(() => {
    // Access the @wordpress/data registry via internal reference
    // Find it via the React context trick
    try {
      const root = document.getElementById('root')
      // Walk fiber tree to find the registry context
      let fiber = root._reactInternals || root[Object.keys(root).find(k => k.startsWith('__reactFiber'))]
      const visited = new Set()
      const queue = [fiber]
      while (queue.length > 0) {
        const node = queue.shift()
        if (!node || visited.has(node)) continue
        visited.add(node)
        // Look for the registry in the memoizedState or pendingProps
        if (node.memoizedState?.registry?.select) {
          const registry = node.memoizedState.registry
          try {
            const blocks = registry.select('core/block-editor').getBlocks()
            return { found: true, blockCount: blocks.length, blocks: blocks.map(b => ({ name: b.name, clientId: b.clientId })) }
          } catch (e) {
            // Not the right registry
          }
        }
        if (node.child) queue.push(node.child)
        if (node.sibling) queue.push(node.sibling)
        if (visited.size > 10000) break
      }
      return { found: false, error: 'Could not find registry in fiber tree' }
    } catch (e) {
      return { found: false, error: e.message }
    }
  })
  console.log('\n=== STORE INFO ===')
  console.log(JSON.stringify(storeInfo, null, 2))
}

await page.screenshot({ path: join(__dirname, 'diagnose-console.png') })
proc.kill()
process.exit(0)
