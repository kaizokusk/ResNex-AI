// lib/streaks/tracker.ts — daily contribution tracking + streak logic
import { prisma } from '@/lib/prisma'

export async function logContribution(projectId: string, userId: string, action: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await prisma.dailyContribution.upsert({
    where: { projectId_userId_date: { projectId, userId, date: today } },
    update: { actions: { push: action } },
    create: { projectId, userId, date: today, actions: [action] },
  })
}

export async function checkAndUpdateStreak(projectId: string): Promise<{
  teamStreak: number
  longestStreak: number
  allContributed: boolean
}> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  })
  if (!project) return { teamStreak: 0, longestStreak: 0, allContributed: false }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const memberIds = project.members.map(m => m.user_id)

  // Check if ALL members contributed today
  const todayContribs = await prisma.dailyContribution.findMany({
    where: { projectId, date: today },
  })
  const allContributed = memberIds.every(uid => todayContribs.some(c => c.userId === uid))

  // Check if ALL members contributed yesterday (to maintain streak)
  const yesterdayContribs = await prisma.dailyContribution.findMany({
    where: { projectId, date: yesterday },
  })
  const allContributedYesterday = memberIds.every(uid => yesterdayContribs.some(c => c.userId === uid))

  let teamStreak = project.teamStreak
  let longestStreak = project.longestStreak

  // Update streak if all contributed yesterday and streak date is behind
  const lastDate = project.lastStreakDate
  if (allContributedYesterday) {
    const lastDateDay = lastDate ? new Date(lastDate).setHours(0, 0, 0, 0) : 0
    if (lastDateDay < yesterday.getTime()) {
      teamStreak += 1
      if (teamStreak > longestStreak) longestStreak = teamStreak
      await prisma.project.update({
        where: { id: projectId },
        data: { teamStreak, longestStreak, lastStreakDate: yesterday },
      })
    }
  } else if (lastDate) {
    // Check if streak was broken (no contribution yesterday)
    const daysSinceLastStreak = Math.floor((today.getTime() - new Date(lastDate).getTime()) / 86400000)
    if (daysSinceLastStreak > 1) {
      teamStreak = 0
      await prisma.project.update({
        where: { id: projectId },
        data: { teamStreak: 0 },
      })
    }
  }

  return { teamStreak, longestStreak, allContributed }
}

export async function getTodayContributions(projectId: string): Promise<
  { userId: string; actions: string[] }[]
> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const contribs = await prisma.dailyContribution.findMany({
    where: { projectId, date: today },
  })
  return contribs.map(c => ({ userId: c.userId, actions: c.actions }))
}
