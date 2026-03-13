'use client'
import { useState } from 'react'

interface Version {
  content: string
  savedAt: string
  wordCount: number
  savedBy: string
}

interface Props {
  projectId: string
  sectionId: string
  versions: Version[]
  onRestore: (index: number) => void
  onClose: () => void
}

export default function VersionHistory({ versions, onRestore, onClose }: Props) {
  const [preview, setPreview] = useState<number | null>(null)

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-gray-800">Version History</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {versions.length === 0 && <p className="text-sm text-gray-500">No versions saved yet.</p>}
        {[...versions].reverse().map((v, i) => (
          <div key={i} className="border rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">v{versions.length - i}</span>
              <span className="text-gray-400 text-xs">{new Date(v.savedAt).toLocaleString()}</span>
            </div>
            <p className="text-gray-500 text-xs">{v.wordCount} words</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setPreview(preview === i ? null : i)} className="text-blue-500 hover:underline text-xs">Preview</button>
              <button onClick={() => onRestore(versions.length - 1 - i)} className="text-green-600 hover:underline text-xs">↺ Restore</button>
            </div>
            {preview === i && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">{v.content.slice(0, 500)}...</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
