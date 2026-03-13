import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DAY_MS = 24 * 60 * 60 * 1000

function getCurrentStreak(dates: string[]) {
  const activeDays = new Set(dates)
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)

  let streak = 0
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS)

    const [totalActions, recentProjectRows, eventRows] = await Promise.all([
      prisma.contributionEvent.count({
        where: { userId: user.id },
      }),
      prisma.contributionEvent.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { projectId: true },
        distinct: ['projectId'],
      }),
      prisma.contributionEvent.findMany({
        where: { userId: user.id },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const uniqueDates = Array.from(
      new Set(
        eventRows.map((event) => {
          const date = new Date(event.createdAt)
          date.setUTCHours(0, 0, 0, 0)
          return date.toISOString().slice(0, 10)
        })
      )
    )

    return NextResponse.json({
      totalActions,
      activeProjects: recentProjectRows.length,
      currentStreak: getCurrentStreak(uniqueDates),
    })
  } catch (error) {
    console.error('[GET /api/dashboard/stats]', error)
    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 })
  }
}
