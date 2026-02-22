import React, { useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Page, PageMeta } from '../../types/page'
import PageItem from './PageItem'
import './PageList.css'

interface Props {
  onOpenPage: (page: Page) => void
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  )
}

export default function PageListView({ onOpenPage }: Props): React.JSX.Element {
  const [metas, setMetas] = useState<PageMeta[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await window.electronAPI.pages.list()
    setMetas(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleNew = useCallback(async () => {
    const id = uuidv4()
    const title = 'Untitled Page'
    const page = await window.electronAPI.pages.create({
      id,
      title,
      slug: slugify(title),
      content: ''
    })
    onOpenPage(page)
  }, [onOpenPage])

  const handleOpen = useCallback(
    async (meta: PageMeta) => {
      const page = await window.electronAPI.pages.read(meta.id)
      if (page) onOpenPage(page)
    },
    [onOpenPage]
  )

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this page? This cannot be undone.')) return
    await window.electronAPI.pages.delete(id)
    setMetas((prev) => prev.filter((m) => m.id !== id))
  }, [])

  if (loading) {
    return <div className="page-list-view__loading">Loading pages...</div>
  }

  return (
    <div className="page-list-view">
      <header className="page-list-view__header">
        <h1 className="page-list-view__title">Pages</h1>
        <button className="page-list-view__new-btn" onClick={handleNew}>
          + New Page
        </button>
      </header>

      <div className="page-list-view__body">
        {metas.length === 0 ? (
          <div className="page-list-view__empty">
            <span>No pages yet</span>
            <span className="page-list-view__empty-hint">
              Click &ldquo;+ New Page&rdquo; to get started
            </span>
          </div>
        ) : (
          <ul className="page-list">
            {metas.map((meta) => (
              <PageItem
                key={meta.id}
                meta={meta}
                onOpen={() => handleOpen(meta)}
                onDelete={() => handleDelete(meta.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
