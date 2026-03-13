'use client'

interface Props {
  allTags: string[]
  selected: string[]
  onToggle: (tag: string) => void
}

export default function TagFilter({ allTags, selected, onToggle }: Props) {
  if (allTags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => selected.forEach(t => onToggle(t))}
        className={`px-2 py-1 rounded-full text-xs ${selected.length === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        All
      </button>
      {allTags.map(tag => (
        <button
          key={tag}
          onClick={() => onToggle(tag)}
          className={`px-2 py-1 rounded-full text-xs ${selected.includes(tag) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
