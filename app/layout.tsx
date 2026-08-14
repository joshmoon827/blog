import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PageTransition from '@/components/PageTransition'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Articles | josh log',
  description: 'Selected articles on the intersection of psychology and user experience.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark">
      <body>
        <AuthProvider>
          <ServiceWorkerRegistrar />
          <a className="skip-link" href="#main">Skip to main content</a>
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
