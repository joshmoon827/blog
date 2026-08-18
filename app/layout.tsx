import type { Metadata } from 'next'
import './globals.css'
import { Suspense } from 'react'
import Header from '@/components/Header'
import LanguageQuerySync from '@/components/LanguageQuerySync'
import Footer from '@/components/Footer'
import PageTransition from '@/components/PageTransition'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import { AuthProvider } from '@/components/AuthProvider'
import { siteConfig, getDefaultDescription } from '@/lib/siteConfig'
import { JsonLd } from '@/lib/jsonLd'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    template: `%s | ${siteConfig.siteName}`,
    default: siteConfig.siteName,
  },
  description: getDefaultDescription('ko'),
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    description: getDefaultDescription('ko'),
    author: {
      '@type': 'Person',
      name: siteConfig.author.name,
      url: siteConfig.author.url,
    },
  }

  return (
    <html lang="ko" data-theme="dark">
      <body>
        <JsonLd data={websiteJsonLd} />
        <AuthProvider>
          <ServiceWorkerRegistrar />
          <a className="skip-link" href="#main">Skip to main content</a>
          <Suspense fallback={null}>
            <LanguageQuerySync />
          </Suspense>
          <Header />
          <PageTransition>
            <main id="main">{children}</main>
          </PageTransition>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
