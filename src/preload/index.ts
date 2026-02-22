import { contextBridge, ipcRenderer } from 'electron'
import type { Page, PageMeta, NewPage } from '../shared/page'

const electronAPI = {
  pages: {
    list: (): Promise<PageMeta[]> => ipcRenderer.invoke('pages:list'),
    read: (id: string): Promise<Page | null> => ipcRenderer.invoke('pages:read', id),
    create: (draft: NewPage): Promise<Page> => ipcRenderer.invoke('pages:create', draft),
    save: (page: Page): Promise<Page> => ipcRenderer.invoke('pages:save', page),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('pages:delete', id)
  },
  dialog: {
    openFile: (
      filters?: Array<{ name: string; extensions: string[] }>
    ): Promise<string | null> => ipcRenderer.invoke('dialog:openFile', filters)
  }
} as const

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
