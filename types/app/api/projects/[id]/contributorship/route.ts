// api/projects/[id]/contributorship/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // In app/api/projects/[id]/contributorship/route.ts
  const logs = await prisma.contributorshipLog.findMany({
    where: { project_id: id },
    include: { user: { select: { id: true, full_name: true, avatar_url: true } } },
    orderBy: { timestamp: 'desc' },
    take: 100,
  })

  // Aggregate by user
  const memberMap = new Map<string, any>()
  logs.forEach(log => {
    if (!memberMap.has(log.user_id)) {
      memberMap.set(log.user_id, {
        userId: log.user_id,
        name: log.user.full_name,
        avatar_url: log.user.avatar_url,
        humanWords: 0,
        aiWords: 0,
        totalWords: 0,
        papersAdded: 0,
        agentCalls: 0,
      })
    }
    const member = memberMap.get(log.user_id)!
    
    // Count words based on action type
    if (log.action === 'ai_prompted') {
      member.aiWords += log.description.split(' ').length // or use a better word count
    } else if (log.action === 'edited' || log.action === 'created') {
      member.humanWords += log.description.split(' ').length
    }
    member.totalWords = member.humanWords + member.aiWords
    member.agentCalls += log.action === 'ai_prompted' ? 1 : 0
  })

  const members = Array.from(memberMap.values())
  const aiRatio = members.map(m => m.totalWords > 0 ? m.aiWords / m.totalWords : 0)

  return NextResponse.json({ 
    members: members.map((m, i) => ({...m, aiRatio: aiRatio[i]})),
    timeline: logs 
  })
}
