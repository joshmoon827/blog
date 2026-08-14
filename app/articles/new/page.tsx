import NewArticleForm from './NewArticleForm'
import { RequestOnly } from '@/components/RequestOnly'

export const instant = false

export const metadata = {
  title: '새 글 작성 | josh log',
}

export default function NewArticlePage() {
  return (
    <RequestOnly>
      <NewArticleForm />
    </RequestOnly>
  )
}
