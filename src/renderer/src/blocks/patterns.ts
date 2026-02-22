/**
 * Block patterns and pattern categories.
 *
 * In modern @wordpress/block-editor (15.x), patterns are passed via the
 * __experimentalBlockPatterns and __experimentalBlockPatternCategories settings
 * to BlockEditorProvider, rather than via a global registerBlockPattern() call.
 */

export interface BlockPattern {
  name: string
  title: string
  description?: string
  content: string
  categories?: string[]
  keywords?: string[]
  viewportWidth?: number
}

export interface BlockPatternCategory {
  name: string
  label: string
}

export const PATTERN_CATEGORIES: BlockPatternCategory[] = [
  { name: 'layout', label: 'Layout' },
  { name: 'hero', label: 'Hero Sections' }
]

export const BLOCK_PATTERNS: BlockPattern[] = [
  {
    name: 'block-editor/hero-section',
    title: 'Hero Section',
    description: 'Full-width hero with heading and paragraph',
    categories: ['hero'],
    keywords: ['hero', 'header', 'banner', 'intro'],
    viewportWidth: 1200,
    content: `<!-- wp:group {"align":"full","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull">
  <!-- wp:heading {"level":1,"textAlign":"center"} -->
  <h1 class="wp-block-heading has-text-align-center">Welcome to Your Page</h1>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">Start writing your story here. Add your subtitle or intro text.</p>
  <!-- /wp:paragraph -->
  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  <div class="wp-block-buttons">
    <!-- wp:button -->
    <div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Get Started</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->
</div>
<!-- /wp:group -->`
  },
  {
    name: 'block-editor/two-columns',
    title: 'Two Column Layout',
    description: 'Two equal columns with text',
    categories: ['layout'],
    keywords: ['columns', 'two column', 'grid'],
    viewportWidth: 1200,
    content: `<!-- wp:columns -->
<div class="wp-block-columns">
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:heading {"level":3} -->
    <h3 class="wp-block-heading">Left Column</h3>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>Add your left column content here.</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:heading {"level":3} -->
    <h3 class="wp-block-heading">Right Column</h3>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>Add your right column content here.</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->`
  },
  {
    name: 'block-editor/feature-cards',
    title: 'Three Feature Cards',
    description: 'Three equal columns for feature highlights',
    categories: ['layout'],
    keywords: ['features', 'cards', 'three column'],
    viewportWidth: 1200,
    content: `<!-- wp:columns {"columns":3} -->
<div class="wp-block-columns has-3-columns">
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:heading {"level":4} -->
    <h4 class="wp-block-heading">Feature One</h4>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>Describe your first feature or benefit here.</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:heading {"level":4} -->
    <h4 class="wp-block-heading">Feature Two</h4>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>Describe your second feature or benefit here.</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:heading {"level":4} -->
    <h4 class="wp-block-heading">Feature Three</h4>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>Describe your third feature or benefit here.</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->`
  }
]
