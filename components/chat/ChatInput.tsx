'use client'
// components/chat/ChatInput.tsx — Chat input with @agent detection + file attachments

import { useState, useRef, KeyboardEvent } from 'react'
import { Spinner } from '../ui'
import { AgentPopover, FileType } from './AgentPopover'
import { useAgentStore } from '../../store/agentStore'
import { uploadFiles } from '../../lib/uploadthingClient'

export interface AttachedFile {
  id: string
  file: File
  type: FileType
  preview?: string     // base64 thumbnail for images
  uploading: boolean
  url?: string         // set after upload
  error?: string
}

export interface Attachment {
  url: string
  type: FileType
  fileName: string
  size: number
}

const MAX_FILES = 3
const MAX_SIZE_MB = 10

function detectFileType(file: File): FileType | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'text/csv' || file.name.endsWith('.csv')) return 'csv'
  return null
}

function FileTypeIcon({ type }: { type: FileType }) {
  if (type === 'image') return <span className="text-xs">🖼</span>
  if (type === 'pdf') return <span className="text-xs">📄</span>
  return <span className="text-xs">📊</span>
}

interface Props {
  onSend: (message: string, attachments: Attachment[], isAnonymous: boolean) => Promise<void>
  onAgentAction: (message: string, action: string, attachments: Attachment[]) => Promise<void>
  sending?: boolean
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({ onSend, onAgentAction, sending, placeholder, disabled }: Props) {
  const [value, setValue] = useState('')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [showPopover, setShowPopover] = useState(false)
  const [agentProcessing, setAgentProcessing] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openPanel } = useAgentStore()

  const hasAgent = value.includes('@agent')
  const fileTypes = [...new Set(files.map((f) => f.type))] as FileType[]
  const isLoading = sending || agentProcessing
  const anyUploading = files.some((f) => f.uploading)
  const readyAttachments: Attachment[] = files
    .filter((f) => f.url && !f.uploading)
    .map((f) => ({ url: f.url!, type: f.type, fileName: f.file.name, size: f.file.size }))

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setValue(v)
    setShowPopover(v.includes('@agent'))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!showPopover) handleSend()
    }
    if (e.key === 'Escape') setShowPopover(false)
  }

  async function uploadFile(attached: AttachedFile): Promise<{ url: string | null; error?: string }> {
    try {
      const result = await uploadFiles('chatAttachment', { files: [attached.file] })
      return { url: result[0]?.url ?? null }
    } catch (err: any) {
      return { url: null, error: err?.message || 'Upload failed' }
    }
  }

  async function addFiles(selected: FileList) {
    const remaining = MAX_FILES - files.length
    if (remaining <= 0) return

    const toAdd: AttachedFile[] = []
    for (const file of Array.from(selected).slice(0, remaining)) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue
      const type = detectFileType(file)
      if (!type) continue

      let preview: string | undefined
      if (type === 'image') {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      }

      toAdd.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, type, preview, uploading: true })
    }

    setFiles((prev) => [...prev, ...toAdd])

    for (const attached of toAdd) {
      const { url, error } = await uploadFile(attached)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === attached.id
            ? { ...f, uploading: false, url: url ?? undefined, error: error ?? (url ? undefined : 'Upload failed') }
            : f
        )
      )
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleSend() {
    const msg = value.trim()
    if ((!msg && files.length === 0) || isLoading || anyUploading) return
    setValue('')
    setFiles([])
    setShowPopover(false)
    await onSend(msg, readyAttachments, isAnonymous)
  }

  async function handleAgentAction(action: string) {
    const msg = value.replace('@agent', '').trim()
    setValue('')
    setFiles([])
    setShowPopover(false)
    setAgentProcessing(true)
    openPanel()
    try {
      await onAgentAction(msg, action, readyAttachments)
    } finally {
      setAgentProcessing(false)
    }
  }

  const canSend = (value.trim().length > 0 || files.length > 0) && !isLoading && !anyUploading && !showPopover

  return (
    <div className="relative flex flex-col gap-2">
      {showPopover && (
        <AgentPopover
          onSelect={handleAgentAction}
          onClose={() => setShowPopover(false)}
          fileTypes={fileTypes}
        />
      )}

      {/* File preview strip */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 bg-[#1a1f2e] border border-[#252a38] rounded-xl px-2.5 py-1.5"
              style={{ maxWidth: '180px' }}
            >
              {f.type === 'image' && f.preview ? (
                <img src={f.preview} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
              ) : (
                <FileTypeIcon type={f.type} />
              )}
              <span className="text-[10px] text-[#c8cad0] truncate flex-1 min-w-0">{f.file.name}</span>
              {f.uploading ? (
                <Spinner size={10} />
              ) : f.error ? (
                <span className="text-[10px] text-[#f43f5e]" title={f.error}>!</span>
              ) : (
                <span className="text-[10px] text-[#3ecf8e]">✓</span>
              )}
              <button
                onClick={() => removeFile(f.id)}
                className="text-[#3d4558] hover:text-[#f43f5e] flex-shrink-0 transition-colors ml-0.5"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 items-end">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= MAX_FILES || isLoading || disabled}
          aria-label="Attach a file — PNG, JPG, PDF or CSV, max 10MB, up to 3 files"
          className="touch-target-expand w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            bg-[#1a1f2e] border border-[#252a38] text-[#7a839a] hover:text-[#e8eaf0]
            hover:border-[#4f8ef7] transition-colors disabled:opacity-40"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,.csv"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
        />

        {/* Textarea */}
        <div className="flex-1 relative">
          <label htmlFor="chat-input" className="sr-only">
            Write a message to the project chat
          </label>
          <textarea
            ref={inputRef}
            id="chat-input"
            aria-describedby="chat-input-hint"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isAnonymous ? 'Send anonymously — your name will be hidden…' : (placeholder || 'Message the team… (type @agent for AI actions)')}
            rows={1}
            disabled={disabled || isLoading}
            className={`w-full bg-[#1a1f2e] rounded-2xl px-4 py-3 text-sm
              text-[#e8eaf0] placeholder:text-[#3d4558]
              transition-all resize-none leading-normal disabled:opacity-50
              ${isAnonymous
                ? 'border border-[#7c3aed]/60 focus:border-[#7c3aed]'
                : 'border border-[#252a38] focus:border-[#4f8ef7]'}`}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <span id="chat-input-hint" className="sr-only">
            Type @agent to ask the AI assistant. Enter sends, Shift+Enter for a new line.
            {isAnonymous ? ' Anonymous mode is on — your name will be hidden from others.' : ''}
          </span>
          {hasAgent && !isAnonymous && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#7c6af5] font-bold pointer-events-none">
              @agent
            </span>
          )}
        </div>

        {/* Anonymous toggle */}
        <button
          type="button"
          onClick={() => setIsAnonymous(v => !v)}
          aria-pressed={isAnonymous}
          aria-label={isAnonymous ? 'Anonymous mode on — click to send as yourself' : 'Send anonymously — click to hide your name'}
          disabled={isLoading || disabled}
          className={`touch-target-expand w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            border transition-colors disabled:opacity-40
            ${isAnonymous
              ? 'bg-[#7c3aed]/20 border-[#7c3aed]/50 text-[#a78bfa]'
              : 'bg-[#1a1f2e] border-[#252a38] text-[#7a839a] hover:text-[#e8eaf0] hover:border-[#7c3aed]/40'}`}
        >
          {/* Ghost / incognito icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 1 7 7v4l1.5 2.5a1 1 0 0 1-.9 1.5H4.4a1 1 0 0 1-.9-1.5L5 13V9a7 7 0 0 1 7-7z"/>
            <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"/>
            <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
            <path d="M9 17c0 1.1.9 2 2 2h2a2 2 0 0 0 0-4h-2a2 2 0 0 0-2 2z"/>
          </svg>
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label={isLoading || anyUploading ? 'Sending message' : isAnonymous ? 'Send anonymously' : 'Send message'}
          aria-disabled={!canSend}
          className={`touch-target-expand w-10 h-10 rounded-2xl disabled:opacity-40
            flex items-center justify-center transition-all flex-shrink-0
            ${isAnonymous ? 'bg-[#7c3aed] hover:bg-[#6d28d9]' : 'bg-[#4f8ef7] hover:bg-[#3d7de8]'}`}
        >
          {isLoading || anyUploading ? (
            <Spinner size={13} color="white" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          )}
        </button>
      </div>

      {(files.length > 0 || isAnonymous) && (
        <p className="text-[10px] px-1 flex items-center gap-2">
          {files.length > 0 && (
            <span className="text-[#3d4558]">{files.length}/{MAX_FILES} files attached · type @agent to process with AI</span>
          )}
          {isAnonymous && (
            <span className="text-[#a78bfa]">● Anonymous mode — your name is hidden from others</span>
          )}
        </p>
      )}
    </div>
  )
}
