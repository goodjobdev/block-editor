import React from 'react'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

interface Props {
  title: string
  saveStatus: SaveStatus
  listViewOpen: boolean
  onTitleChange: (title: string) => void
  onBack: () => void
  onToggleListView: () => void
  onSaveNow: () => void
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving\u2026',
  unsaved: 'Unsaved'
}

export default function EditorHeader({
  title,
  saveStatus,
  listViewOpen,
  onTitleChange,
  onBack,
  onToggleListView,
  onSaveNow
}: Props): React.JSX.Element {
  return (
    <header className="editor-header">
      <button className="editor-header__back" onClick={onBack} title="Back to pages">
        &#x2190; Pages
      </button>

      <button
        className={`editor-header__list-view-btn${listViewOpen ? ' is-active' : ''}`}
        onClick={onToggleListView}
        title="Document Overview"
        aria-pressed={listViewOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <input
        className="editor-header__title"
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Page title"
        aria-label="Page title"
      />

      <div className="editor-header__actions">
        <span className={`editor-header__status editor-header__status--${saveStatus}`}>
          {STATUS_LABEL[saveStatus]}
        </span>
        <button
          className="editor-header__save-btn"
          onClick={onSaveNow}
          title="Save now (Cmd+S)"
        >
          Save
        </button>
      </div>
    </header>
  )
}
