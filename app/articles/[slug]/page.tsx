import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { readAll, readOne } from '@/lib/localArticles'
import { siteConfig } from '@/lib/siteConfig'
import { JsonLd } from '@/lib/jsonLd'
import ArticleView from './ArticleView'

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: raw } = await params
  const slug = resolveSlug(raw)
  if (slug === 'new') return { title: '새 글 작성' }
  const article = readOne(slug)
  if (!article || article.trashed) return { title: 'Not Found' }

  const articleUrl = `${siteConfig.siteUrl}/articles/${slug}`
  const description = article.description || article.title
  const imageUrl = article.image.startsWith('http')
    ? article.image
    : `${siteConfig.siteUrl}${article.image}`

  return {
    title: article.title,
    description: description.slice(0, 160),
    alternates: {
      canonical: `/articles/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: description.slice(0, 160),
      url: articleUrl,
      siteName: siteConfig.siteName,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: article.created ? new Date(article.created).toISOString() : undefined,
      images: [
        {
          url: imageUrl,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: description.slice(0, 160),
      images: [imageUrl],
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params
  const slug = resolveSlug(raw)
  if (slug === 'new') redirect('/articles/new')
  const article = readOne(slug)
  if (!article || article.trashed) notFound()

  const articleUrl = `${siteConfig.siteUrl}/articles/${slug}`
  const imageUrl = article.image.startsWith('http')
    ? article.image
    : `${siteConfig.siteUrl}${article.image}`

  const blogPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description || article.title,
    image: imageUrl,
    datePublished: article.created ? new Date(article.created).toISOString() : undefined,
    author: {
      '@type': 'Person',
      name: siteConfig.author.name,
      url: siteConfig.author.url,
    },
    publisher: {
      '@type': 'Person',
      name: siteConfig.author.name,
      url: siteConfig.author.url,
    },
    url: articleUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
  }

  return (
    <>
      <JsonLd data={blogPostingJsonLd} />
      <Suspense fallback={null}>
        <ArticleView article={article} />
      </Suspense>
    </>
  )
}
