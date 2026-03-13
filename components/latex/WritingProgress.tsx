'use client'
import { useLatexStore, LatexFile } from '../../store/latexStore'
import { Cell, SectionDoc } from '../../lib/cell-types'

function parseCells(content: string | null): Cell[] {
  if (!content) return []
  try { return (JSON.parse(content) as SectionDoc).cells ?? [] } catch { return [] }
}

function wordCount(cells: Cell[]): number {
  return cells.reduce((acc, c) => {
    if (c.type === 'text' || c.type === 'heading' || c.type === 'note') {
      return acc + ((c as any).content?.trim().split(/\s+/).filter(Boolean).length ?? 0)
    }
    return acc
  }, 0)
}

function displayName(fileName: string): string {
  return fileName.replace('sections/', '').replace('.json', '').replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface Props {
  projectId: string
}

export function WritingProgress({ projectId }: Props) {
  const { files, setActiveFile } = useLatexStore()

  const sections = files
    .filter((f) => f.fileName.startsWith('sections/') && f.fileName.endsWith('.json'))
    .sort((a, b) => a.fileName.localeCompare(b.fileName))

  if (sections.length === 0) return null

  const total = sections.length
  const done = sections.filter((f) => {
    const cells = parseCells(f.content)
    return cells.some((c) => c.type === 'text' && (c as any).content?.trim().length > 0)
  }).length

  return (
    <div className="border-t border-[#1a1f2e] flex-shrink-0">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[9px] font-bold text-[#3d4558] uppercase tracking-wider">Writing Progress</span>
        <span className="text-[9px] text-[#3d4558]">{done}/{total} done</span>
      </div>

      {/* Progress bar */}
      <div className="px-3 mb-2">
        <div className="h-1 bg-[#1a1f2e] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7c6af5] rounded-full transition-all"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-48 px-2 pb-2 space-y-0.5">
        {sections.map((f) => {
          const cells = parseCells(f.content)
          const words = wordCount(cells)
          const hasContent = cells.some((c) => c.type === 'text' && (c as any).content?.trim())
          const isEmpty = cells.length === 0
          const icon = isEmpty ? '⬜' : hasContent ? '✅' : '🔄'

          return (
            <button
              key={f.id}
              onClick={() => setActiveFile(f.id)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#0d1018] transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] flex-shrink-0">{icon}</span>
                <span className="text-[10px] text-[#7a839a] truncate">{displayName(f.fileName)}</span>
              </div>
              {words > 0 && (
                <span className="text-[9px] text-[#3d4558] flex-shrink-0 ml-1">{words}w</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
