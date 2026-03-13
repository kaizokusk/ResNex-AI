'use client'
import { useState } from 'react'

interface Props {
  projectId: string
  paperId: string
  tags: string[]
  onTagsChange: (tags: string[]) => void
}

export default function TagInput({ projectId, paperId, tags, onTagsChange }: Props) {
  const [input, setInput] = useState('')

  async function addTag(tag: string) {
    if (!tag.trim() || tags.includes(tag.trim())) return
    const newTags = [...tags, tag.trim().toLowerCase()]
    await fetch(`/api/projects/${projectId}/papers/${paperId}/tags`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags })
    })
    onTagsChange(newTags)
    setInput('')
  }

  async function removeTag(tag: string) {
    const newTags = tags.filter(t => t !== tag)
    await fetch(`/api/projects/${projectId}/papers/${paperId}/tags`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags })
    })
    onTagsChange(newTags)
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-blue-900">✕</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(input) } }}
        placeholder="Add tag..."
        className="text-xs border-none outline-none bg-transparent w-20"
      />
    </div>
  )
}
