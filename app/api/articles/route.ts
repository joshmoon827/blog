import { NextResponse } from 'next/server'
import { readAll } from '@/lib/localArticles'

export async function GET() {
  const articles = readAll()
  return NextResponse.json(articles)
}
