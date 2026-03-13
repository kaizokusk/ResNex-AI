'use client'
import { useRef, useState } from 'react'
import { FigureCell } from '../../../lib/cell-types'
import { sanitizeLatexAssetFileName } from '../../../lib/latex-assets'
import { uploadFiles } from '../../../lib/uploadthingClient'

interface Props {
  cell: FigureCell
  onChange: (updated: FigureCell) => void
  onFocus: () => void
  onInfer: () => void
  inferring: boolean
}

export function FigureCellBlock({ cell, onChange, onFocus, onInfer, inferring }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const [uploaded] = await uploadFiles('latexAsset', { files: [file] })
      onChange({
        ...cell,
        fileUrl: uploaded.url,
        fileName: sanitizeLatexAssetFileName(`figures/${file.name}`),
      })
    } catch (err: any) {
      alert(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2" onClick={onFocus}>
      {/* Image area */}
      {cell.fileUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-[#252a38] bg-[#0d1018]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cell.fileUrl} alt={cell.caption || 'figure'} className="max-h-64 w-full object-contain" />
          <button
            onClick={() => onChange({ ...cell, fileUrl: '', fileName: '' })}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#1a1f2e]/80 text-[#f87171] hover:bg-[#f87171] hover:text-white text-xs flex items-center justify-center transition-colors"
            title="Remove image"
          >×</button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-[#252a38] hover:border-[#7c6af5] rounded-lg py-6 flex flex-col items-center gap-1 text-[#3d4558] hover:text-[#7c6af5] transition-colors disabled:opacity-50"
        >
          <span className="text-2xl">📷</span>
          <span className="text-[11px] font-semibold">{uploading ? 'Uploading…' : 'Click to upload image'}</span>
          <span className="text-[10px]">or drag & drop</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Caption */}
      <input
        type="text"
        value={cell.caption}
        placeholder="Figure caption…"
        onChange={(e) => onChange({ ...cell, caption: e.target.value })}
        className="w-full bg-transparent text-[12px] text-[#7a839a] placeholder-[#3d4558] italic focus:outline-none border-b border-transparent focus:border-[#252a38] pb-0.5 transition-colors"
      />

      {/* Infer button — visible once image or caption exists */}
      {(cell.fileUrl || cell.caption) && (
        <button
          onClick={onInfer}
          disabled={inferring}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7c6af5] hover:text-[#a78bfa] disabled:opacity-50 transition-colors"
        >
          <span>✨</span>
          <span>{inferring ? 'Generating analysis…' : 'Infer — write analysis of this figure'}</span>
        </button>
      )}
    </div>
  )
}
