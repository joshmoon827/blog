import type { Metadata } from 'next'
import FolderImpactLab from './FolderImpactLab'

export const instant = false

export const metadata: Metadata = {
  title: 'Folder ASCII impact | test-ui',
  robots: { index: false, follow: false },
}

export default function FolderImpactPage() {
  return <FolderImpactLab />
}
