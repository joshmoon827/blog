import { extractBlocks } from './headings'
import styles from './lab.module.css'

export default function HeadingBody({
  markdown,
  articleSlug,
}: {
  markdown: string
  articleSlug: string
}) {
  const blocks = extractBlocks(markdown)
  return (
    <div className={styles.body}>
      {blocks.map((block, i) => {
        if (block.type === 'p') {
          return (
            <p key={i} className={styles.p}>
              {block.text}
            </p>
          )
        }
        const Tag = (`h${block.level}`) as 'h1' | 'h2' | 'h3'
        const showHash = block.level === 2 || block.level === 3
        return (
          <Tag
            key={block.id}
            id={block.id}
            className={`${styles.heading} ${
              block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3
            }`}
          >
            {showHash ? (
              <a
                className={styles.permalink}
                href={`/articles/${articleSlug}#${block.id}`}
                aria-label={`${block.text} permalink`}
              >
                #
              </a>
            ) : null}
            {block.text}
          </Tag>
        )
      })}
    </div>
  )
}
