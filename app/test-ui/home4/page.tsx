import HomeVariantPage, { homeVariantMetadata } from '@/components/home/HomeVariantPage'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = homeVariantMetadata[4]

export default function Home4Page() {
  return <HomeVariantPage variant={4} />
}
