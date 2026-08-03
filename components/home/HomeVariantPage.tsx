import Link from 'next/link'
import Image from 'next/image'
import ArticleCard from '@/components/ArticleCard'
import ImageCarousel from '@/components/ImageCarousel'
import type { Article } from '@/data/articles'
import { collectTagsFromArticles } from '@/data/metadata'
import { getListedArticles } from '@/lib/listedArticles'
import styles from './HomeVariantPage.module.css'

export type HomeVariantNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

type LayoutKind = 'magazine' | 'dashboard' | 'split' | 'gallery' | 'path' | 'minimal' | 'studio'

interface HomeVariantConfig {
  id: HomeVariantNumber
  layout: LayoutKind
  themeClass: string
  eyebrow: string
  title: string
  deck: string
  cta: string
  featuredIndex: number
}

const homeVariants: HomeVariantConfig[] = [
  {
    id: 1,
    layout: 'magazine',
    themeClass: 'magazineTheme',
    eyebrow: 'Homepage 01',
    title: 'Psychology-first essays for product teams',
    deck: 'A roomy editorial homepage with one lead essay, supporting picks, and a calm archive grid.',
    cta: 'Read the lead article',
    featuredIndex: 0,
  },
  {
    id: 2,
    layout: 'dashboard',
    themeClass: 'dashboardTheme',
    eyebrow: 'Homepage 02',
    title: 'A research desk for UX patterns',
    deck: 'A metrics-led dashboard layout that frames the article library as a working research index.',
    cta: 'Open the research brief',
    featuredIndex: 3,
  },
  {
    id: 3,
    layout: 'split',
    themeClass: 'splitTheme',
    eyebrow: 'Homepage 03',
    title: 'Browse by principle, then go deep',
    deck: 'A persistent desktop category rail paired with dense cards for quick scanning.',
    cta: 'Start with cognitive load',
    featuredIndex: 7,
  },
  {
    id: 4,
    layout: 'gallery',
    themeClass: 'galleryTheme',
    eyebrow: 'Homepage 04',
    title: 'A visual wall of behavioral design ideas',
    deck: 'A gallery-forward homepage that treats every article as a collectible visual reference.',
    cta: 'Explore the gallery',
    featuredIndex: 5,
  },
  {
    id: 5,
    layout: 'path',
    themeClass: 'pathTheme',
    eyebrow: 'Homepage 05',
    title: 'Follow a guided path through UX laws',
    deck: 'A sequenced learning homepage for readers who want a suggested order and clear progression.',
    cta: 'Begin the path',
    featuredIndex: 2,
  },
  {
    id: 6,
    layout: 'minimal',
    themeClass: 'minimalTheme',
    eyebrow: 'Homepage 06',
    title: 'Quiet reading for practical designers',
    deck: 'A text-forward homepage that keeps the interface spare and lets article summaries carry the page.',
    cta: 'Read the latest note',
    featuredIndex: 6,
  },
  {
    id: 7,
    layout: 'studio',
    themeClass: 'studioTheme',
    eyebrow: 'Homepage 07',
    title: 'A studio-style front door for UX essays',
    deck: 'A polished landing page with featured tracks, strong visual rhythm, and a newsletter-style close.',
    cta: 'View featured track',
    featuredIndex: 4,
  },
]

export const homeVariantMetadata = Object.fromEntries(
  homeVariants.map((variant) => [
    variant.id,
    {
      title: `${variant.eyebrow} | Laws of UX`,
      description: variant.deck,
    },
  ]),
) as Record<HomeVariantNumber, { title: string; description: string }>

export function getHomeVariant(id: HomeVariantNumber) {
  return homeVariants.find((variant) => variant.id === id) ?? homeVariants[0]
}

export default function HomeVariantPage({ variant }: { variant: HomeVariantNumber }) {
  const articles = getListedArticles()
  const config = getHomeVariant(variant)
  const featuredIndex = Math.min(config.featuredIndex, Math.max(articles.length - 1, 0))
  const featuredArticle = articles[featuredIndex] ?? articles[0]
  const rotatedArticles = rotateArticles(articles, featuredIndex)

  return (
    <main className={`${styles.page} ${styles[config.themeClass]}`}>
      <ExampleNav active={config.id} />

      {config.id === 3 && featuredArticle ? (
        <SplitPosterHero article={featuredArticle} />
      ) : featuredArticle ? (
        <section className={`${styles.hero} ${styles[`${config.layout}Hero`]}`} aria-labelledby="home-variant-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{config.eyebrow}</p>
            <h1 id="home-variant-title">{config.title}</h1>
            <p>{config.deck}</p>
            <div className={styles.heroActions}>
              <Link href={`/articles/${featuredArticle.slug}`}>{config.cta}</Link>
              <span>{articles.length} essays on psychology, UX, and design craft</span>
            </div>
          </div>
          <FeaturedVisual article={featuredArticle} />
        </section>
      ) : null}

      {renderVariantContent(config, rotatedArticles)}
    </main>
  )
}

function ExampleNav({ active }: { active: HomeVariantNumber }) {
  return (
    <nav className={styles.exampleNav} aria-label="Homepage design examples">
      {homeVariants.map((variant) => (
        <Link
          key={variant.id}
          href={`/test-ui/home${variant.id}`}
          className={variant.id === active ? styles.exampleNavActive : ''}
          aria-current={variant.id === active ? 'page' : undefined}
        >
          Home {variant.id}
        </Link>
      ))}
    </nav>
  )
}

function FeaturedVisual({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`} className={styles.featuredVisual}>
      <ImageCarousel src={article.image} alt={article.title} aspectRatio="16 / 11" />
      <div>
        <span>Featured</span>
        <strong>{article.title}</strong>
      </div>
    </Link>
  )
}

function SplitPosterHero({ article }: { article: Article }) {
  return (
    <section className={`${styles.hero} ${styles.posterHero}`} aria-labelledby="home-variant-title">
      <div className={styles.posterTitleBlock}>
        <p className={styles.posterEyebrow}>Homepage 03</p>
        <h1 id="home-variant-title" className={styles.posterTitle}>
          <span>MISSION</span>
          <span>&amp;VISION</span>
        </h1>
        <Link
          href={`/articles/${article.slug}`}
          className={styles.posterImageStrip}
          aria-label={`Read ${article.title}`}
        >
          <Image src={article.image} alt="" fill sizes="(max-width: 640px) 86vw, (max-width: 980px) 78vw, 920px" />
        </Link>
      </div>
    </section>
  )
}

function renderVariantContent(config: HomeVariantConfig, orderedArticles: Article[]) {
  switch (config.layout) {
    case 'dashboard':
      return <DashboardLayout articles={orderedArticles} />
    case 'split':
      return <SplitLayout articles={orderedArticles} />
    case 'gallery':
      return <GalleryLayout articles={orderedArticles} />
    case 'path':
      return <PathLayout articles={orderedArticles} />
    case 'minimal':
      return <MinimalLayout articles={orderedArticles} />
    case 'studio':
      return <StudioLayout articles={orderedArticles} />
    case 'magazine':
    default:
      return <MagazineLayout articles={orderedArticles} />
  }
}

function MagazineLayout({ articles: orderedArticles }: { articles: Article[] }) {
  return (
    <section className={styles.magazineLayout} aria-label="Editorial article selection">
      <Link href={`/articles/${orderedArticles[0].slug}`} className={styles.leadStory}>
        <ImageCarousel
          src={orderedArticles[0].image}
          alt={orderedArticles[0].title}
          aspectRatio="21 / 10"
          priority
        />
        <div>
          <span>Lead essay</span>
          <h2>{orderedArticles[0].title}</h2>
          <p>{orderedArticles[0].description}</p>
        </div>
      </Link>
      <div className={styles.storyRail}>
        {orderedArticles.slice(1, 4).map((article) => (
          <TextLinkCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  )
}

function DashboardLayout({ articles: orderedArticles }: { articles: Article[] }) {
  return (
    <section className={styles.dashboardLayout} aria-label="Research dashboard">
      <div className={styles.metricStrip}>
        <Metric value="08" label="Principles" />
        <Metric value="24m" label="Reading sprint" />
        <Metric value="05" label="Core themes" />
      </div>
      <div className={styles.cardGrid}>
        {orderedArticles.slice(0, 3).map((article, index) => (
          <ArticleCard key={article.slug} article={article} index={index} variant={index === 0 ? 'wide' : 'default'} />
        ))}
      </div>
    </section>
  )
}

function SplitLayout({ articles: orderedArticles }: { articles: Article[] }) {
  const tags = collectTagsFromArticles(orderedArticles).slice(0, 7)

  return (
    <section className={styles.splitLayout} aria-label="Tagged article browser">
      <aside className={styles.tagRail}>
        <span>Browse principles</span>
        {tags.map((tag, index) => (
          <Link key={tag} href={`/home?tag=${encodeURIComponent(tag)}`} className={index === 0 ? styles.tagRailActive : ''}>
            {tag}
          </Link>
        ))}
      </aside>
      <div className={styles.compactList}>
        {orderedArticles.slice(0, 6).map((article) => (
          <TextLinkCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  )
}

function GalleryLayout({ articles: orderedArticles }: { articles: Article[] }) {
  return (
    <section className={styles.galleryLayout} aria-label="Visual article gallery">
      {orderedArticles.slice(0, 6).map((article, index) => (
        <Link key={article.slug} href={`/articles/${article.slug}`} className={styles.galleryCard}>
          <ImageCarousel
            src={article.image}
            alt={article.title}
            aspectRatio={index === 0 ? '16 / 10' : '4 / 3'}
          />
          <div>
            <span>{article.tags[0]}</span>
            <strong>{article.title}</strong>
          </div>
        </Link>
      ))}
    </section>
  )
}

function PathLayout({ articles: orderedArticles }: { articles: Article[] }) {
  return (
    <section className={styles.pathLayout} aria-label="Guided reading path">
      {orderedArticles.slice(0, 5).map((article, index) => (
        <Link key={article.slug} href={`/articles/${article.slug}`} className={styles.pathItem}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <h2>{article.title}</h2>
            <p>{article.description}</p>
          </div>
        </Link>
      ))}
    </section>
  )
}

function MinimalLayout({ articles: orderedArticles }: { articles: Article[] }) {
  return (
    <section className={styles.minimalLayout} aria-label="Minimal article index">
      <div className={styles.minimalIntro}>
        <span>Latest notes</span>
        <p>Short, practical reads on the patterns behind better digital products.</p>
      </div>
      <div className={styles.essayList}>
        {orderedArticles.slice(0, 7).map((article) => (
          <TextLinkCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  )
}

function StudioLayout({ articles: orderedArticles }: { articles: Article[] }) {
  return (
    <section className={styles.studioLayout} aria-label="Featured UX tracks">
      <div className={styles.trackGrid}>
        {orderedArticles.slice(0, 4).map((article, index) => (
          <Link key={article.slug} href={`/articles/${article.slug}`} className={styles.trackCard}>
            <span>Track {index + 1}</span>
            <h2>{article.tags.join(' + ')}</h2>
            <p>{article.title}</p>
          </Link>
        ))}
      </div>
      <div className={styles.newsletterPanel}>
        <span>Weekly reading list</span>
        <h2>Design laws, psychology notes, and examples worth saving.</h2>
        <Link href="/home">Browse all articles</Link>
      </div>
    </section>
  )
}

function TextLinkCard({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`} className={styles.textCard}>
      <span>{article.tags.join(' / ')}</span>
      <h2>{article.title}</h2>
      <p>{article.description}</p>
    </Link>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function rotateArticles(articles: Article[], startIndex: number) {
  if (articles.length === 0) return []
  const index = startIndex % articles.length
  return [...articles.slice(index), ...articles.slice(0, index)]
}
