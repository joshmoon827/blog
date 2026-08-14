import NewriteEditor from './NewriteEditor'
import { RequestOnly } from '@/components/RequestOnly'

export const instant = false

export const metadata = {
  title: '글쓰기 | Newrite',
}

export default function NewritePage() {
  return (
    <RequestOnly>
      <NewriteEditor />
    </RequestOnly>
  )
}
