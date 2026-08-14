import ArticleCard from '@/components/ArticleCard'
import ArticlesGrid from '@/components/ArticlesGrid'
import HomeInteractiveBanner from '@/components/HomeInteractiveBanner'
import SeriesArticleList from '@/components/SeriesArticleList'
import SeriesCards from '@/components/SeriesCards'
import SeriesWebglBanner from '@/components/category-webgl/SeriesWebglBanner'
import TagFilterBar from '@/components/TagFilterBar'
import {
  isInteractiveHomeSeriesMode,
  isWebglHomeSeriesMode,
} from '@/lib/homeSeriesMode'
import { resolveHomeBannerMode } from '@/lib/homeSeriesMode.server'
import { getListedArticles } from '@/lib/listedArticles'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getPretextFeatureArticle } from '@/lib/pretextArticle.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import styles from './page.module.css'

interface ArticlesPageProps {
  searchParams?: Promise<{
    tag?: string | string[]
  }>
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams
  const selectedTag = typeof params?.tag === 'string' ? params.tag : undefined
  const listed = getListedArticles()
  const seriesMode = resolveHomeBannerMode()
  const mosaicPattern = readMosaicPattern()
  const seriesItems = getSeriesPreviewItems(
    seriesMode === 'mosaic' ? mosaicSlotCount(mosaicPattern) : 3,
  )
  const pretextArticle =
    seriesMode === 'pretext' ? getPretextFeatureArticle() : null
  const filteredArticles = selectedTag
    ? listed.filter((article) => article.tags.includes(selectedTag))
    : listed

  return (
    <>
      {isWebglHomeSeriesMode(seriesMode) ? (
        <SeriesWebglBanner
          items={seriesItems}
          mode={seriesMode}
          className={`${styles.seriesStrip} ${styles.seriesStripFlush}`}
        />
      ) : isInteractiveHomeSeriesMode(seriesMode) ? (
        <HomeInteractiveBanner
          items={seriesItems}
          mode={seriesMode}
          pretextArticle={pretextArticle}
          className={`${styles.seriesStrip} ${styles.seriesStripFlush}`}
        />
      ) : (
        <SeriesCards
          items={seriesItems}
          variant={seriesMode === 'slide' ? 'slide' : 'mosaic'}
          pattern={mosaicPattern}
          className={styles.seriesStrip}
          ariaLabel="Category"
        />
      )}
      <section className={styles.hero}>
        <TagFilterBar articles={listed} selectedTag={selectedTag} />
      </section>
      <div className={styles.gridDesktop}>
        <ArticlesGrid className={styles.grid} aria-label="Articles">
          {filteredArticles.map((article, i) => (
            <ArticleCard key={article.slug} article={article} index={i} />
          ))}
        </ArticlesGrid>
      </div>
      <div className={styles.listMobile}>
        <SeriesArticleList articles={filteredArticles} />
      </div>
    </>
  )
}
