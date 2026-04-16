import { notFound } from 'next/navigation'
import { articles } from '@/data/articles'
import { readOne } from '@/lib/localArticles'
import ArticleView from './ArticleView'

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = readOne(slug)
  return { title: article ? `${article.title} | Laws of UX` : 'Not Found' }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = readOne(slug)
  if (!article) notFound()

  return <ArticleView article={article} />
}
