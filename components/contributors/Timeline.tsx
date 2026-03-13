'use client'

interface TimelineEntry {
  date: string
  memberName: string
  action: string
  details?: string
}

interface Props {
  entries: TimelineEntry[]
}

export default function Timeline({ entries }: Props) {
  return (
    <div className="mt-6">
      <h3 className="font-semibold text-gray-700 mb-3">Contribution Timeline</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {entries.length === 0 && <p className="text-sm text-gray-400">No contributions yet.</p>}
        {entries.map((e, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="text-gray-400 w-32 shrink-0">{new Date(e.date).toLocaleDateString()}</span>
            <span className="font-medium text-gray-700 w-24 shrink-0">{e.memberName}</span>
            <span className="text-gray-600">{e.action}</span>
            {e.details && <span className="text-gray-400">{e.details}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
