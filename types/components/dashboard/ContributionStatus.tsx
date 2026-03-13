'use client'

interface MemberStatus {
  name: string
  contributed: boolean
  actions: string[]
}

interface Props {
  members: MemberStatus[]
}

export default function ContributionStatus({ members }: Props) {
  return (
    <div className="space-y-1">
      {members.map((m, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className={m.contributed ? 'text-green-500' : 'text-gray-300'}>●</span>
          <span className={m.contributed ? 'text-gray-700' : 'text-gray-400'}>{m.name}</span>
          {m.actions.length > 0 && <span className="text-xs text-gray-400">({m.actions.join(', ')})</span>}
        </div>
      ))}
    </div>
  )
}
