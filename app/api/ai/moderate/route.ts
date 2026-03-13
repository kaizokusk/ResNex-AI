// api/ai/moderate/route.ts — Run moderation check on any content

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../lib/auth'
import { moderateContent } from '../../../../lib/moderation'
import { ModerationContext } from '../../../../types'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { content, context } = body as { content: string; context: ModerationContext }

  if (!content || !context) {
    return NextResponse.json({ error: 'content and context required' }, { status: 400 })
  }

  const result = await moderateContent(content, context)
  return NextResponse.json(result)
}
