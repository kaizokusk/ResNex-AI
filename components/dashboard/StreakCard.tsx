'use client'
import { useEffect, useState } from 'react'

interface MemberStatus {
  userId: string
  name: string
  contributed: boolean
  actions: string[]
}

interface StreakData {
  teamStreak: number
  longestStreak: number
  memberStatus: MemberStatus[]
}

interface Props {
  projectId: string
  projectTitle: string
}

export default function StreakCard({ projectId, projectTitle }: Props) {
  const [data, setData] = useState<StreakData | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/streak`).then(r => r.json()).then(setData)
  }, [projectId])

  async function nudge(targetUserId: string) {
    await fetch(`/api/projects/${projectId}/streak/nudge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId })
    })
  }

  if (!data) return null

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-3">{projectTitle}</h3>
      <div className="flex gap-4 mb-3">
        <div><span className="font-bold text-lg">{data.teamStreak}</span> <span className="text-sm text-gray-500">day streak</span></div>
        <div><span className="font-bold">{data.longestStreak}</span> <span className="text-sm text-gray-500">best</span></div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 mb-1">Today's contributions:</p>
        {data.memberStatus.map(m => (
          <div key={m.userId} className="flex items-center justify-between text-sm">
            <span>{m.contributed ? '[+]' : '[ ]'} {m.name}</span>
            {!m.contributed && (
              <button onClick={() => nudge(m.userId)} className="text-xs text-blue-500 hover:underline">Nudge</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
