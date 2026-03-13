import type { PrismaClient } from '@prisma/client'

type DbError = {
  code?: string
  message?: string
  meta?: {
    code?: string
    message?: string
  }
}

type RecordContributionEventArgs = {
  prisma: PrismaClient
  projectId: string
  userId: string
  action: string
  logLabel: string
}

type RecordContributionEventWithThrottleArgs = RecordContributionEventArgs & {
  dedupeWindowMs: number
}

function isMissingContributionEventsTable(error: unknown) {
  const dbError = error as DbError
  return (
    dbError?.code === 'P2010' &&
    (dbError.meta?.code === '42P01' ||
      dbError.meta?.message?.includes('relation "ContributionEvent" does not exist') ||
      dbError.message?.includes('relation "ContributionEvent" does not exist'))
  )
}

function logContributionEventError(logLabel: string, error: unknown) {
  if (isMissingContributionEventsTable(error)) {
    console.warn(
      `[contribution-event] ${logLabel} skipped because the ContributionEvent table is missing. Run "npx prisma migrate deploy".`
    )
    return
  }

  console.error(`[contribution-event] ${logLabel} failed:`, error)
}

export async function recordContributionEvent({
  prisma,
  projectId,
  userId,
  action,
  logLabel,
}: RecordContributionEventArgs) {
  try {
    await prisma.$executeRaw`
      INSERT INTO "ContributionEvent" ("id", "projectId", "userId", "action", "createdAt")
      VALUES (md5(random()::text || clock_timestamp()::text), ${projectId}, ${userId}, ${action}, NOW())
    `
  } catch (error) {
    logContributionEventError(logLabel, error)
  }
}

export async function recordContributionEventWithThrottle({
  prisma,
  projectId,
  userId,
  action,
  logLabel,
  dedupeWindowMs,
}: RecordContributionEventWithThrottleArgs) {
  try {
    const since = new Date(Date.now() - dedupeWindowMs)
    const recentEvents = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ContributionEvent"
      WHERE "projectId" = ${projectId}
        AND "userId" = ${userId}
        AND "action" = ${action}
        AND "createdAt" >= ${since}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `

    if (recentEvents.length > 0) return

    await prisma.$executeRaw`
      INSERT INTO "ContributionEvent" ("id", "projectId", "userId", "action", "createdAt")
      VALUES (md5(random()::text || clock_timestamp()::text), ${projectId}, ${userId}, ${action}, NOW())
    `
  } catch (error) {
    logContributionEventError(logLabel, error)
  }
}
