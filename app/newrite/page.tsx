import NewriteEditor from './NewriteEditor'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: '글쓰기 | Newrite',
}

export default function NewritePage() {
  return <NewriteEditor />
}
