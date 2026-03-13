'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MemberContribution {
  name: string
  humanWords: number
  aiWords: number
}

interface Props {
  data: MemberContribution[]
}

export default function ContributionCharts({ data }: Props) {
  return (
    <div className="mt-6">
      <h3 className="font-semibold text-gray-700 mb-3">Word Contributions</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="humanWords" name="Human Words" fill="#3b82f6" stackId="a" />
          <Bar dataKey="aiWords" name="AI Words" fill="#a78bfa" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
