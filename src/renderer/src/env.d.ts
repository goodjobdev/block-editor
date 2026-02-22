/// <reference types="vite/client" />

import type { Page, PageMeta, NewPage } from '../../../shared/page'

declare global {
  interface Window {
    electronAPI: {
      pages: {
        list: () => Promise<PageMeta[]>
        read: (id: string) => Promise<Page | null>
        create: (draft: NewPage) => Promise<Page>
        save: (page: Page) => Promise<Page>
        delete: (id: string) => Promise<void>
      }
      dialog: {
        openFile: (
          filters?: Array<{ name: string; extensions: string[] }>
        ) => Promise<string | null>
      }
    }
  }
}
