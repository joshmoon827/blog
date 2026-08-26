import ErrorPageView from '@/components/error-scenes/ErrorPageView'

export default function Unauthorized() {
  return <ErrorPageView kind="401" />
}
