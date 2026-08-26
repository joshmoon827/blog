/**
 * Dev-only: Next/Turbopack + notFound() can call performance.measure with
 * childrenEndTime still at -Infinity (github.com/vercel/next.js/issues/86060).
 * Production is unaffected; this only swallows that specific TypeError.
 */
if (process.env.NODE_ENV === 'development' && typeof performance !== 'undefined') {
  const original = performance.measure.bind(performance)
  performance.measure = ((...args: Parameters<typeof performance.measure>) => {
    try {
      return original(...args)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('negative time stamp') || message.includes('cannot be negative')) {
        return undefined as unknown as PerformanceMeasure
      }
      throw error
    }
  }) as typeof performance.measure
}
