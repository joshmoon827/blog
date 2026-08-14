'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  /* Writer chrome uses position:fixed; Framer will-change:transform creates a
     containing block that collapses height — skip transition on /newrite. */
  const isWriter = pathname === '/newrite' || pathname.startsWith('/newrite/')
  const isImmersiveTestUi = pathname.startsWith('/test-ui/simplicity')

  if (isWriter || isImmersiveTestUi) {
    return (
      <div style={{ height: '100%', minHeight: '100dvh', overflow: 'hidden' }}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ willChange: 'opacity, transform', overflowX: 'hidden' }}
    >
      {children}
    </motion.div>
  )
}
