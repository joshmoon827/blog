import HomeVariantPage, { homeVariantMetadata } from '@/components/home/HomeVariantPage'

export const metadata = homeVariantMetadata[2]

export default function Home2Page() {
  return <HomeVariantPage variant={2} />
}
