/**
 * TypeScript module declarations for @wordpress packages.
 * The official @types packages are outdated; these cover the APIs we actually use.
 */

// ── @wordpress/blocks ────────────────────────────────────────────────────────

declare module '@wordpress/blocks' {
  export interface BlockInstance {
    clientId: string
    name: string
    attributes: Record<string, unknown>
    innerBlocks: BlockInstance[]
    isValid?: boolean
  }

  export interface BlockPattern {
    title: string
    description?: string
    content: string
    categories?: string[]
    keywords?: string[]
    viewportWidth?: number
    inserter?: boolean
  }

  export interface BlockPatternCategory {
    label: string
    description?: string
  }

  export function registerBlockType(name: string, settings: Record<string, unknown>): void
  export function registerBlockPattern(name: string, pattern: BlockPattern): void
  export function registerBlockPatternCategory(
    name: string,
    category: BlockPatternCategory
  ): void
  export function parse(content: string): BlockInstance[]
  export function serialize(blocks: BlockInstance[]): string
  export function createBlock(
    name: string,
    attributes?: Record<string, unknown>,
    innerBlocks?: BlockInstance[]
  ): BlockInstance
  export function getBlockType(name: string): Record<string, unknown> | undefined
  export function getBlockTypes(): Record<string, unknown>[]
}

// ── @wordpress/block-library ─────────────────────────────────────────────────

declare module '@wordpress/block-library' {
  export function registerCoreBlocks(): void
}

// ── @wordpress/block-editor ──────────────────────────────────────────────────

declare module '@wordpress/block-editor' {
  import type { BlockInstance } from '@wordpress/blocks'

  interface CanvasStyle {
    css: string
    assets?: string
  }

  interface EditorSettings {
    hasFixedToolbar?: boolean
    focusMode?: boolean
    isDistractionFree?: boolean
    supportsLayout?: boolean
    [key: string]: unknown
  }

  // Provider — wraps everything, manages block state
  export function BlockEditorProvider(props: {
    value: BlockInstance[]
    onInput: (blocks: BlockInstance[]) => void
    onChange: (blocks: BlockInstance[]) => void
    settings?: EditorSettings
    children?: import('react').ReactNode
  }): import('react').ReactElement | null

  // Iframe-based editing canvas
  export function BlockCanvas(props: {
    height?: string | number
    styles?: CanvasStyle[]
    children?: import('react').ReactNode
  }): import('react').ReactElement | null

  // Non-iframe block list
  export function BlockList(props: { className?: string }): import('react').ReactElement | null

  // Toolbar + insertion point wrapper
  export function BlockTools(props: {
    children?: import('react').ReactNode
    className?: string
  }): import('react').ReactElement | null

  // Inspector sidebar for selected block
  export function BlockInspector(props: {
    showNoBlockSelectedMessage?: boolean
  }): import('react').ReactElement | null

  // Toolbar controls slot (renders in block toolbar)
  export function BlockControls(props: {
    children?: import('react').ReactNode
  }): import('react').ReactElement | null

  // Inspector controls slot (renders in sidebar)
  export function InspectorControls(props: {
    children?: import('react').ReactNode
  }): import('react').ReactElement | null

  // Keyboard shortcuts
  export function BlockEditorKeyboardShortcuts(): import('react').ReactElement | null

  // Hooks
  export function useBlockProps(
    props?: Record<string, unknown>
  ): Record<string, unknown>

  export function useInnerBlocksProps(
    props?: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Record<string, unknown>

  // Document overview / block tree
  export function __experimentalListView(props: {
    showBlockMovers?: boolean
    isExpanded?: boolean
  }): import('react').ReactElement | null

  // Store descriptor
  export const store: { name: 'core/block-editor' }
}

// ── @wordpress/format-library ─────────────────────────────────────────────────

declare module '@wordpress/format-library' {
  // Side-effect import: registers bold, italic, link, strikethrough, etc.
}

// ── CSS raw imports ──────────────────────────────────────────────────────────

declare module '@wordpress/block-library/build-style/style.css' {
  const css: string
  export default css
}

declare module '@wordpress/block-library/build-style/editor.css' {
  const css: string
  export default css
}
