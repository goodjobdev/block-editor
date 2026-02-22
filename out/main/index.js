import { ipcMain, dialog, app, BrowserWindow, shell } from "electron";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let PAGES_DIR;
let INDEX_FILE;
function getPagesDir() {
  if (!PAGES_DIR) PAGES_DIR = join(app.getPath("userData"), "pages");
  return PAGES_DIR;
}
function getIndexFile() {
  if (!INDEX_FILE) INDEX_FILE = join(getPagesDir(), "index.json");
  return INDEX_FILE;
}
function ensurePagesDir() {
  const dir = getPagesDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function readIndex() {
  const file = getIndexFile();
  if (!existsSync(file)) return [];
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
}
function writeIndex(metas) {
  writeFileSync(getIndexFile(), JSON.stringify(metas, null, 2), "utf-8");
}
function pageFilePath(id) {
  return join(getPagesDir(), `${id}.json`);
}
ipcMain.handle("pages:list", () => {
  ensurePagesDir();
  return readIndex();
});
ipcMain.handle("pages:read", (_event, id) => {
  const filePath = pageFilePath(id);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
});
ipcMain.handle("pages:create", (_event, draft) => {
  ensurePagesDir();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const page = { ...draft, createdAt: now, updatedAt: now };
  writeFileSync(pageFilePath(page.id), JSON.stringify(page, null, 2), "utf-8");
  const metas = readIndex();
  const meta = { id: page.id, title: page.title, slug: page.slug, updatedAt: now };
  metas.unshift(meta);
  writeIndex(metas);
  return page;
});
ipcMain.handle("pages:save", (_event, page) => {
  ensurePagesDir();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = { ...page, updatedAt: now };
  writeFileSync(pageFilePath(page.id), JSON.stringify(updated, null, 2), "utf-8");
  const metas = readIndex();
  const idx = metas.findIndex((m) => m.id === page.id);
  const meta = { id: page.id, title: page.title, slug: page.slug, updatedAt: now };
  if (idx >= 0) metas[idx] = meta;
  else metas.unshift(meta);
  writeIndex(metas);
  return updated;
});
ipcMain.handle("pages:delete", (_event, id) => {
  const filePath = pageFilePath(id);
  if (existsSync(filePath)) unlinkSync(filePath);
  const metas = readIndex().filter((m) => m.id !== id);
  writeIndex(metas);
});
ipcMain.handle(
  "dialog:openFile",
  async (_event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: filters ?? [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg"] },
        { name: "Videos", extensions: ["mp4", "webm", "ogg", "mov"] }
      ]
    });
    return result.canceled ? null : result.filePaths[0];
  }
);
const isDev = !!process.env["ELECTRON_RENDERER_URL"];
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (isDev) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
