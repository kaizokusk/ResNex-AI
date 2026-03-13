'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ContributorsTable from '@/components/contributors/ContributorsTable'
import ContributionCharts from '@/components/contributors/ContributionCharts'
import Timeline from '@/components/contributors/Timeline'

export default function ContributorsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/contributorship`)
      .then(r => r.json())
      .then(d => { 
        console.log('Contributorship data:', d)
        setData(d); setLoading(false) })
  }, [projectId])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading contributions...</div>
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>

  const members = data.members || []
  const tableData = members.map((m: any) => ({
    userId: m.userId,
    name: m.name,
    wordCount: m.totalWords || 0,
    papersAdded: m.papersAdded || 0,
    agentCalls: m.agentCalls || 0,
    aiRatio: m.aiRatio || 0
  }))
  const chartData = members.map((m: any) => ({
    name: m.name,
    humanWords: m.humanWords || 0,
    aiWords: m.aiWords || 0
  }))
  const timeline = (data.timeline || []).map((log: any) => ({
  date: log.timestamp,                     
  memberName: log.user?.full_name ?? '–',  
  action: log.action,
  details: log.description,
  }))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Contributors</h1>
      <ContributorsTable contributions={tableData} />
      <ContributionCharts data={chartData} />
      <Timeline entries={timeline} />
    </div>
  )
}
