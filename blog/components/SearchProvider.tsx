'use client'

import { KBarSearchProvider } from 'pliny/search/KBar'
import { useRouter } from 'next/navigation'
import { CoreContent } from 'pliny/utils/contentlayer'
import { Blog } from 'contentlayer/generated'

export const SearchProvider = ({ children }) => {
  const router = useRouter()
  return (
    <KBarSearchProvider
      kbarConfig={{
        searchDocumentsPath: 'blog/search.json',
        defaultActions: [
          {
            id: 'homepage',
            name: 'Homepage',
            keywords: '',
            shortcut: ['h', 'h'],
            section: 'Home',
            perform: () => router.push('/'),
          },
        ],
        onSearchDocumentsLoad(json) {
          return json.map((post: CoreContent<Blog>) => ({
            id: post.path,
            name: post.title,
            keywords: post?.summary || '',
            section: 'Blog',
            subtitle: post.tags.join(', '),
            perform: () => router.push(`/${post.slug}`),
          }))
        },
      }}
    >
      {children}
    </KBarSearchProvider>
  )
}
