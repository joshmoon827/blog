import { NextRequest, NextResponse } from 'next/server'
import { isAuthedRequest } from '@/lib/auth'

/** Returns a 401 response when the request is not authenticated. */
export async function unauthorizedIfGuest(
  req: NextRequest,
): Promise<NextResponse | null> {
  if (await isAuthedRequest(req)) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
