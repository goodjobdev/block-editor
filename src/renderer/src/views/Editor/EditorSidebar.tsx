import React from 'react'
import { BlockInspector } from '@wordpress/block-editor'

export default function EditorSidebar(): React.JSX.Element {
  return (
    <aside className="editor-sidebar">
      {/*
        BlockInspector reads the block-editor store to find the currently
        selected block and renders its InspectorControls automatically.
        No props needed — it's fully self-contained.
      */}
      <BlockInspector />
    </aside>
  )
}
