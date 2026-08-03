import HomeArticleIndex, { type HomeArticleIndexSearchParams } from '@/components/home/HomeArticleIndex'

interface HomePageProps {
  searchParams?: HomeArticleIndexSearchParams
}

export default function HomePage({ searchParams }: HomePageProps) {
  return <HomeArticleIndex searchParams={searchParams} basePath="/home" />
}
