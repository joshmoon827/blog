import HomeVariantPage, { homeVariantMetadata } from '@/components/home/HomeVariantPage'

export const metadata = homeVariantMetadata[1]

export default function Home1Page() {
  return <HomeVariantPage variant={1} />
}
