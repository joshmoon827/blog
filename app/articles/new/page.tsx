import NewArticleForm from './NewArticleForm'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: '새 글 작성 | josh log',
}

export default function NewArticlePage() {
  return <NewArticleForm />
}
