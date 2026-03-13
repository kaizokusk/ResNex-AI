'use client'
import { useState } from 'react'
import { getGoogleAuthUrl } from '@/lib/integrations/googleClassroom'

interface Course {
  id: string
  name: string
}

interface Props {
  projectId: string
  projectTitle: string
}

export default function ShareToClassroom({ projectId, projectTitle }: Props) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [message, setMessage] = useState(`ResearchCollab submission: ${projectTitle}`)
  const [loading, setLoading] = useState(false)
  const [shared, setShared] = useState(false)
  const [error, setError] = useState('')

  async function loadCourses() {
    const res = await fetch('/api/integrations/classroom/courses')
    if (res.status === 401) {
      window.location.href = getGoogleAuthUrl(projectId)
      return
    }
    const data = await res.json()
    setCourses(data.courses || [])
  }

  async function share() {
    if (!selectedCourse) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/projects/${projectId}/share/classroom`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: selectedCourse, message })
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setShared(true)
    setLoading(false)
  }

  if (shared) return <div className="text-green-600 text-sm">Shared to Google Classroom!</div>

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-3">Share to Google Classroom</h3>
      {courses.length === 0 ? (
        <button onClick={loadCourses} className="bg-white border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-50">
          Connect Google Classroom
        </button>
      ) : (
        <div className="space-y-3">
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">Select classroom...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border rounded p-2 text-sm h-20" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={share} disabled={!selectedCourse || loading} className="bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      )}
    </div>
  )
}
