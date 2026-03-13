import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const WINDOW_DAYS = 112
const DAY_MS = 24 * 60 * 60 * 1000

type ContributionRow = {
  count: bigint | number
  date: Date
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildEmptyResponse(windowStart: Date) {
  const days = Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = new Date(windowStart.getTime() + index * DAY_MS)
    return {
      date: toIsoDate(date),
      count: 0,
    }
  })

  return {
    days,
    currentStreak: 0,
    totalActiveDays: 0,
  }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const todayUtc = startOfUtcDay(new Date())
  const windowStart = new Date(todayUtc.getTime() - (WINDOW_DAYS - 1) * DAY_MS)

  let rows: ContributionRow[] = []
  try {
    rows = await prisma.$queryRaw<ContributionRow[]>`
      SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::timestamp AS "date",
             COUNT(*)::bigint AS "count"
      FROM "ContributionEvent"
      WHERE "userId" = ${user.id}
        AND "createdAt" >= ${windowStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `
  } catch (error) {
    console.warn('[dashboard/contributions] falling back to zero-state response:', error)
    return NextResponse.json(buildEmptyResponse(windowStart))
  }

  const countsByDate = new Map(
    rows.map((row) => [
      toIsoDate(new Date(row.date)),
      Number(row.count),
    ])
  )

  const days = Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = new Date(windowStart.getTime() + index * DAY_MS)
    const isoDate = toIsoDate(date)
    return {
      date: isoDate,
      count: countsByDate.get(isoDate) ?? 0,
    }
  })

  let currentStreak = 0
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].count > 0) {
      currentStreak += 1
      continue
    }
    break
  }

  const totalActiveDays = days.filter((day) => day.count > 0).length

  return NextResponse.json({ days, currentStreak, totalActiveDays })
}
