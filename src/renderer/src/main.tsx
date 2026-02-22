import React from 'react'
import ReactDOM from 'react-dom/client'

// Register the MediaUpload override BEFORE registerCoreBlocks
import './lib/mediaUpload'

import { registerCoreBlocks } from '@wordpress/block-library'
// Registers format types: bold, italic, link, etc.
import '@wordpress/format-library'

import './styles/globals.css'
import App from './App'

// Register all core Gutenberg blocks once at startup
registerCoreBlocks()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
