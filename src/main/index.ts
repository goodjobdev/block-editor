import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import type { Page, PageMeta, NewPage } from '../shared/page'

// ── Storage paths ──────────────────────────────────────────────────────────

// Lazily computed so app.getPath() is called after app is ready
let PAGES_DIR: string
let INDEX_FILE: string

function getPagesDir(): string {
  if (!PAGES_DIR) PAGES_DIR = join(app.getPath('userData'), 'pages')
  return PAGES_DIR
}

function getIndexFile(): string {
  if (!INDEX_FILE) INDEX_FILE = join(getPagesDir(), 'index.json')
  return INDEX_FILE
}

function ensurePagesDir(): void {
  const dir = getPagesDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function readIndex(): PageMeta[] {
  const file = getIndexFile()
  if (!existsSync(file)) return []
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as PageMeta[]
  } catch {
    return []
  }
}

function writeIndex(metas: PageMeta[]): void {
  writeFileSync(getIndexFile(), JSON.stringify(metas, null, 2), 'utf-8')
}

function pageFilePath(id: string): string {
  return join(getPagesDir(), `${id}.json`)
}

// ── IPC Handlers ───────────────────────────────────────────────────────────

ipcMain.handle('pages:list', (): PageMeta[] => {
  ensurePagesDir()
  return readIndex()
})

ipcMain.handle('pages:read', (_event, id: string): Page | null => {
  const filePath = pageFilePath(id)
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Page
  } catch {
    return null
  }
})

ipcMain.handle('pages:create', (_event, draft: NewPage): Page => {
  ensurePagesDir()
  const now = new Date().toISOString()
  const page: Page = { ...draft, createdAt: now, updatedAt: now }
  writeFileSync(pageFilePath(page.id), JSON.stringify(page, null, 2), 'utf-8')
  const metas = readIndex()
  const meta: PageMeta = { id: page.id, title: page.title, slug: page.slug, updatedAt: now }
  metas.unshift(meta)
  writeIndex(metas)
  return page
})

ipcMain.handle('pages:save', (_event, page: Page): Page => {
  ensurePagesDir()
  const now = new Date().toISOString()
  const updated: Page = { ...page, updatedAt: now }
  writeFileSync(pageFilePath(page.id), JSON.stringify(updated, null, 2), 'utf-8')
  const metas = readIndex()
  const idx = metas.findIndex((m) => m.id === page.id)
  const meta: PageMeta = { id: page.id, title: page.title, slug: page.slug, updatedAt: now }
  if (idx >= 0) metas[idx] = meta
  else metas.unshift(meta)
  writeIndex(metas)
  return updated
})

ipcMain.handle('pages:delete', (_event, id: string): void => {
  const filePath = pageFilePath(id)
  if (existsSync(filePath)) unlinkSync(filePath)
  const metas = readIndex().filter((m) => m.id !== id)
  writeIndex(metas)
})

ipcMain.handle(
  'dialog:openFile',
  async (_event, filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters ?? [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
        { name: 'Videos', extensions: ['mp4', 'webm', 'ogg', 'mov'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0]
  }
)

// ── BrowserWindow ──────────────────────────────────────────────────────────

const isDev = !!process.env['ELECTRON_RENDERER_URL']

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in the system browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
