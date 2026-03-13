'use client'

interface MemberContribution {
  userId: string
  name: string
  wordCount: number
  papersAdded: number
  agentCalls: number
  aiRatio: number
}

interface Props {
  contributions: MemberContribution[]
}

export default function ContributorsTable({ contributions }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-indigo-100 dark:bg-indigo-800">
        <tr className="border-b">
          <th className="text-left p-3 bg-indigo-100 dark:bg-indigo-800">Member</th>
          <th className="text-right p-3 bg-indigo-100 dark:bg-indigo-800">Words</th>
          <th className="text-right p-3 bg-indigo-100 dark:bg-indigo-800">Papers</th>
          <th className="text-right p-3 bg-indigo-100 dark:bg-indigo-800">@agent</th>
          <th className="text-right p-3 bg-indigo-100 dark:bg-indigo-800">AI Ratio</th>
        </tr>
      </thead>
        <tbody>
          {contributions.map(c => (
            <tr key={c.userId} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{c.name}</td>
              <td className="text-right p-3">{c.wordCount.toLocaleString()}</td>
              <td className="text-right p-3">{c.papersAdded}</td>
              <td className="text-right p-3">{c.agentCalls} calls</td>
              <td className="text-right p-3">{Math.round(c.aiRatio * 100)}% AI</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
