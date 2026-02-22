export interface Page {
  id: string
  title: string
  slug: string
  /** Gutenberg serialized HTML: <!-- wp:paragraph --><p>...</p><!-- /wp:paragraph --> */
  content: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export type PageMeta = Pick<Page, 'id' | 'title' | 'slug' | 'updatedAt'>

export type NewPage = Omit<Page, 'createdAt' | 'updatedAt'>
