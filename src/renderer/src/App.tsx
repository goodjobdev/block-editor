import React, { useState } from 'react'
import PageListView from './views/PageList'
import EditorView from './views/Editor'
import type { Page } from './types/page'

type View = { name: 'list' } | { name: 'editor'; page: Page }

export default function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ name: 'list' })

  return (
    <div className="app-layout">
      {view.name === 'list' ? (
        <PageListView onOpenPage={(page) => setView({ name: 'editor', page })} />
      ) : (
        <EditorView
          initialPage={view.page}
          onBack={() => setView({ name: 'list' })}
        />
      )}
    </div>
  )
}
