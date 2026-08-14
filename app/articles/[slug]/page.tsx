import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { readAll, readOne } from '@/lib/localArticles'
import ArticleView from './ArticleView'

/** Local JSON changes at runtime; Unicode slugs break static param matching. */
export const dynamic = 'force-dynamic'

function resolveSlug(raw: string): string {
  let slug = raw
  try {
    slug = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  return slug.normalize('NFC')
}

export function generateStaticParams() {
  return readAll()
    .filter((a) => !a.trashed)
    .map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params
  const slug = resolveSlug(raw)
  if (slug === 'new') return { title: '새 글 작성 | josh log' }
  const article = readOne(slug)
  if (!article || article.trashed) return { title: 'Not Found' }
  return { title: `${article.title} | josh log` }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params
  const slug = resolveSlug(raw)
  if (slug === 'new') redirect('/articles/new')
  const article = readOne(slug)
  if (!article || article.trashed) notFound()

  return (
    <Suspense fallback={null}>
      <ArticleView article={article} />
    </Suspense>
  )
}
