import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PageTransition from '@/components/PageTransition'

export const metadata: Metadata = {
  title: 'Articles | Laws of UX',
  description: 'Selected articles on the intersection of psychology and user experience.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <a className="skip-link" href="#main">Skip to main content</a>
        <Header />
        <PageTransition>
          <main id="main">{children}</main>
        </PageTransition>
        <Footer />
      </body>
    </html>
  )
}
