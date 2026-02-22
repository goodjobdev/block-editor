// Test: verify the blank canvas bug is fixed
import puppeteer from '/Users/john/dev/AGENTIC/block-editor/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  defaultViewport: null
})

const targets = await browser.targets()
const t = targets.find(t => t.type() === 'page')
const page = await t.page()

console.log('Connected to page')

// Use evaluate to click — avoids puppeteer's scroll/layout checks that hang
const goBack = await page.evaluate(() => {
  const btn = document.querySelector('.editor-header__back')
  if (btn) { btn.click(); return 'clicked back' }
  return 'already on list'
})
console.log(goBack)

await new Promise(r => setTimeout(r, 2000))

// Find the Content Test page button and click it
const openPage = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
  const match = buttons.find(b => b.textContent?.includes('Content Test') || b.textContent?.includes('test-with-content'))
  if (match) { match.click(); return 'opened: ' + match.textContent?.trim() }

  // Show what's available
  return 'not found, available: ' + buttons.map(b => b.textContent?.trim()).filter(Boolean).join(' | ')
})
console.log(openPage)

await new Promise(r => setTimeout(r, 4000))

// Check the canvas content
const result = await page.evaluate(() => {
  const iframe = document.querySelector('iframe')
  if (!iframe) return { error: 'no iframe' }
  const doc = iframe.contentDocument
  if (!doc) return { error: 'no iframe document' }

  const editables = Array.from(doc.querySelectorAll('[contenteditable="true"]'))
  return {
    count: editables.length,
    items: editables.map(el => ({
      tag: el.tagName,
      text: el.textContent,
      hasBOM: el.textContent === '\uFEFF',
      innerHTML: el.innerHTML.substring(0, 80)
    }))
  }
})

console.log('\n=== Canvas check ===')
console.log(JSON.stringify(result, null, 2))

if (result.items) {
  const allBOM = result.items.length > 0 && result.items.every(c => c.hasBOM)
  const hasContent = result.items.some(c => !c.hasBOM && c.text?.trim().length > 0)

  if (allBOM) console.log('\n❌ BUG STILL PRESENT: all contenteditable = BOM (empty)')
  else if (hasContent) console.log('\n✅ FIX WORKS: content visible in canvas!')
  else console.log('\n⚠️ No editables or mixed state')
}

await browser.disconnect()
process.exit(0)
