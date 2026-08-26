'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from './PageTransition.module.css'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

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
    <div className={styles.shell}>
      <motion.div
        className={styles.stage}
        key={pathname}
        /* Opacity only: x/y makes Motion inject overflowX:hidden (SSR mismatch
           and clips covers that punch under the header). */
        initial={hasMounted ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {children}
      </motion.div>
    </div>
  )
}
