'use client'
import { useState, useEffect } from 'react'

interface Paper {
  id: string
  title: string
  authors: string[]
  year: number | null
}

interface Props {
  projectId: string
  onSelect: (bibKey: string) => void
  onClose: () => void
}

export default function CitationPicker({ projectId, onSelect, onClose }: Props) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${projectId}/papers`).then(r => r.json()).then(d => setPapers(d.papers || d || []))
  }, [projectId])

  const filtered = papers.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.authors?.join(' ').toLowerCase().includes(query.toLowerCase()))

  function makeBibKey(p: Paper) {
    const last = p.authors?.[0]?.split(' ').pop()?.toLowerCase() || 'unknown'
    return `${last}${p.year || 'nd'}`
  }

  return (
    <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-80 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Insert Citation</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search papers..." className="w-full border rounded px-2 py-1 text-sm mb-2" autoFocus />
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filtered.slice(0, 10).map(p => (
          <button key={p.id} onClick={() => { onSelect(`\\cite{${makeBibKey(p)}}`); onClose() }} className="w-full text-left p-2 hover:bg-blue-50 rounded text-sm">
            <div className="font-medium truncate">{p.title}</div>
            <div className="text-gray-400 text-xs">{p.authors?.[0]} {p.year}</div>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No papers found</p>}
      </div>
    </div>
  )
}
