// app/api/user/route.ts — GET + PATCH current user profile

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { full_name, affiliation, language } = body

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(full_name ? { full_name } : {}),
      ...(affiliation !== undefined ? { affiliation } : {}),
      ...(language ? { language } : {}),
    },
  })

  return NextResponse.json(updated)
}
