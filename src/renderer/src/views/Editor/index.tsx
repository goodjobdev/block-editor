import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  BlockEditorProvider,
  BlockTools,
  BlockCanvas,
  BlockInspector,
  __experimentalListView as ListView
} from '@wordpress/block-editor'
import { SlotFillProvider } from '@wordpress/components'
import { parse, serialize } from '@wordpress/blocks'
import type { BlockInstance } from '@wordpress/blocks'
import type { Page } from '../../types/page'
import EditorHeader from './EditorHeader'
import { useAutoSave } from '../../lib/useAutoSave'
import { BLOCK_PATTERNS, PATTERN_CATEGORIES } from '../../blocks/patterns'
import './Editor.css'

import blockLibraryCSS from '@wordpress/block-library/build-style/style.css?raw'
import blockLibraryEditorCSS from '@wordpress/block-library/build-style/editor.css?raw'

const CANVAS_STYLES = [
  { css: blockLibraryCSS },
  { css: blockLibraryEditorCSS },
  {
    css: `
      body {
        padding: 48px 16px;
        max-width: 800px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 16px;
        line-height: 1.6;
        color: #1e1e1e;
      }
    `
  }
]

const EDITOR_SETTINGS = {
  hasFixedToolbar: false,
  focusMode: false,
  isDistractionFree: false,
  supportsLayout: true,
  __experimentalBlockPatterns: BLOCK_PATTERNS,
  __experimentalBlockPatternCategories: PATTERN_CATEGORIES
}

interface Props {
  initialPage: Page
  onBack: () => void
}

export default function EditorView({ initialPage, onBack }: Props): React.JSX.Element {
  const [page, setPage] = useState<Page>(initialPage)
  const [blocks, setBlocks] = useState<BlockInstance[]>(() =>
    initialPage.content ? parse(initialPage.content) : []
  )
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [showListView, setShowListView] = useState(false)

  // Ref that always holds the most current page state — updated synchronously
  // in every event handler so manual saves never read a stale React closure.
  const currentPageRef = useRef<Page>(initialPage)

  const doSave = useCallback(async (pageToSave: Page) => {
    setSaveStatus('saving')
    try {
      const saved = await window.electronAPI.pages.save(pageToSave)
      currentPageRef.current = saved
      setPage(saved)
      setSaveStatus('saved')
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('unsaved')
    }
  }, [])

  const { scheduleAutoSave } = useAutoSave(doSave, 1500)

  // Block changes — read from ref so we never have a stale page closure
  const handleBlocksChange = useCallback(
    (updatedBlocks: BlockInstance[]) => {
      setBlocks(updatedBlocks)
      const updatedPage: Page = { ...currentPageRef.current, content: serialize(updatedBlocks) }
      currentPageRef.current = updatedPage
      setPage(updatedPage)
      setSaveStatus('unsaved')
      scheduleAutoSave(updatedPage)
    },
    [scheduleAutoSave]
  )

  const handleTitleChange = useCallback(
    (title: string) => {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'untitled'
      const updatedPage: Page = { ...currentPageRef.current, title, slug }
      currentPageRef.current = updatedPage
      setPage(updatedPage)
      setSaveStatus('unsaved')
      scheduleAutoSave(updatedPage)
    },
    [scheduleAutoSave]
  )

  // Manual save — always uses the ref, so it works even if React hasn't
  // flushed the latest state update yet.
  const handleSaveNow = useCallback(() => {
    doSave(currentPageRef.current)
  }, [doSave])

  // Flush save before navigating away so content is never lost on back.
  const handleBack = useCallback(async () => {
    await doSave(currentPageRef.current)
    onBack()
  }, [doSave, onBack])

  // Keyboard shortcut: Cmd/Ctrl+S — attached to both parent and iframe.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        doSave(currentPageRef.current)
      }
    }

    window.addEventListener('keydown', handler)

    let interval: ReturnType<typeof setInterval> | null = null
    let iframeDoc: Document | null = null

    const attach = (): boolean => {
      const iframe = document.querySelector('.editor-canvas-wrap iframe') as HTMLIFrameElement | null
      const doc = iframe?.contentDocument
      if (doc && doc !== iframeDoc && doc.readyState !== 'loading') {
        iframeDoc = doc
        doc.addEventListener('keydown', handler)
        return true
      }
      return false
    }

    if (!attach()) {
      interval = setInterval(() => { if (attach() && interval) { clearInterval(interval); interval = null } }, 200)
    }

    return () => {
      window.removeEventListener('keydown', handler)
      if (interval) clearInterval(interval)
      iframeDoc?.removeEventListener('keydown', handler)
    }
  }, [doSave])

  return (
    <SlotFillProvider>
      <div className="editor-layout">
        <EditorHeader
          title={page.title}
          saveStatus={saveStatus}
          listViewOpen={showListView}
          onTitleChange={handleTitleChange}
          onBack={handleBack}
          onToggleListView={() => setShowListView((v) => !v)}
          onSaveNow={handleSaveNow}
        />

        <BlockEditorProvider
          value={blocks}
          onInput={handleBlocksChange}
          onChange={handleBlocksChange}
          settings={EDITOR_SETTINGS}
        >
          <div className="editor-body">
            {showListView && (
              <aside className="editor-list-view-panel">
                <div className="editor-list-view-panel__header">List View</div>
                <div className="editor-list-view-panel__body">
                  <ListView />
                </div>
              </aside>
            )}

            <div className="editor-canvas-wrap">
              <BlockTools>
                <BlockCanvas
                  height="100%"
                  styles={CANVAS_STYLES}
                />
              </BlockTools>
            </div>

            <aside className="editor-sidebar">
              <BlockInspector />
            </aside>
          </div>
        </BlockEditorProvider>
      </div>
    </SlotFillProvider>
  )
}
