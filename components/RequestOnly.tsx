import { Suspense, type ReactNode } from 'react'
import { connection } from 'next/server'

/** Defer children until request time so prerender never sees cookies/headers/Hangul ByteString headers. */
export function RequestOnly({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <WaitForRequest>{children}</WaitForRequest>
    </Suspense>
  )
}

async function WaitForRequest({ children }: { children: ReactNode }) {
  await connection()
  return children
}
