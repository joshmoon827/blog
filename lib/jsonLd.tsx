/**
 * Safe JSON-LD component that escapes content to prevent script tag breakout.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const jsonString = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  )
}
