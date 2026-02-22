import React from 'react'
import type { PageMeta } from '../../types/page'

interface Props {
  meta: PageMeta
  onOpen: () => void
  onDelete: () => void
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso))
}

export default function PageItem({ meta, onOpen, onDelete }: Props): React.JSX.Element {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <li className="page-item" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <div className="page-item__info">
        <span className="page-item__title">{meta.title || 'Untitled'}</span>
        <span className="page-item__meta">
          /{meta.slug} &middot; {formatDate(meta.updatedAt)}
        </span>
      </div>
      <button
        className="page-item__delete"
        onClick={handleDelete}
        title="Delete page"
        aria-label={`Delete "${meta.title}"`}
      >
        &#x2715;
      </button>
    </li>
  )
}
