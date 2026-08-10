import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { readAll, readOne } from '@/lib/localArticles'
import ArticleView from './ArticleView'

export function generateStaticParams() {
  return readAll()
    .filter((a) => !a.trashed)
    .map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === 'new') return { title: '새 글 작성 | Laws of UX' }
  const article = readOne(slug)
  if (!article || article.trashed) return { title: 'Not Found' }
  return { title: `${article.title} | Laws of UX` }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === 'new') redirect('/articles/new')
  const article = readOne(slug)
  if (!article || article.trashed) notFound()

  return (
    <Suspense fallback={null}>
      <ArticleView article={article} />
    </Suspense>
  )
}
