'use client'
// components/belonging/ReflectionInput.tsx
// Feature 6 — Private Reflection Space
// Displays today's prompt, textarea for free-write, save + share (anonymous) controls.
// PRIVACY: entries are strictly user-private. Share is explicitly opt-in & anonymous.

import { useState, useEffect } from 'react'

const PROMPTS = [
  "What felt hard today, and why do you think that is?",
  "Where did you feel out of your depth this week? What would help?",
  "Describe a moment you doubted yourself. What would you tell a friend in the same situation?",
  "What's one thing you've learned recently that you didn't know before joining this project?",
  "What assumptions did you bring to this research that have been challenged?",
  "Who on the team makes you feel most capable? What do they do?",
  "What would you have to believe about yourself to feel fully legitimate here?",
  "When do you feel most like a researcher? When least?",
  "Write about a small win this week — no matter how small.",
  "What would you regret not saying in this project?",
  "What are you still figuring out, and is that okay?",
  "What does 'good enough' look like in your contribution?",
]

const MAX_CHARS = 5000
const MIN_SAVE_CHARS = 10

interface ReflectionInputProps {
  projectId: string
  onSaved: (entry: { id: string; content: string; promptIndex: number; isShared: boolean; createdAt: string }) => void
}

export function ReflectionInput({ projectId, onSaved }: ReflectionInputProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showShareConfirm, setShowShareConfirm] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [justShared, setJustShared] = useState(false)

  // Rotate prompt by day-of-year so every user sees the same prompt each day
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  )
  const promptIndex = dayOfYear % PROMPTS.length
  const prompt = PROMPTS[promptIndex]

  const charCount = text.length
  const canSave = charCount >= MIN_SAVE_CHARS && !savedId
  const canShare = !!savedId && !justShared

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, promptIndex }),
      })
      if (!res.ok) throw new Error('save failed')
      const entry = await res.json()
      setSavedId(entry.id)
      onSaved(entry)
    } catch {
      // Non-critical; user can retry
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    if (!savedId || justShared) return
    setSharing(true)
    setShareError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/reflection/${savedId}/share`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setShareError(body.error || 'Could not share')
        return
      }
      setJustShared(true)
      setShowShareConfirm(false)
    } catch {
      setShareError('Could not share. Try again.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: 'var(--color-violet)18', border: '1px solid var(--color-violet)30' }}
        >
          🔮
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
            Today&apos;s reflection
          </p>
          <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Private — only you can see this
          </p>
        </div>
      </div>

      {/* Prompt */}
      <div
        className="rounded-xl px-4 py-3 mb-4"
        style={{ background: 'var(--color-violet)0d', border: '1px solid var(--color-violet)25' }}
      >
        <p className="text-[13px] italic leading-relaxed" style={{ color: 'var(--color-text)' }}>
          &ldquo;{prompt}&rdquo;
        </p>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        placeholder="Write freely — this is just for you…"
        rows={6}
        disabled={!!savedId}
        className="w-full resize-none rounded-xl px-4 py-3 text-[13px] leading-relaxed outline-none transition-colors"
        style={{
          background: savedId ? 'var(--color-surface)' : 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-body)',
          opacity: savedId ? 0.7 : 1,
        }}
      />

      {/* Char counter + actions */}
      <div className="flex items-center justify-between mt-2 gap-3">
        <p className="text-[11px]" style={{ color: charCount > MAX_CHARS * 0.9 ? 'var(--color-amber)' : 'var(--color-muted)' }}>
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </p>

        <div className="flex items-center gap-2">
          {/* Share button — only after save */}
          {savedId && !justShared && (
            <button
              onClick={() => setShowShareConfirm(true)}
              className="text-[12px] px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'var(--color-border)',
                color: 'var(--color-muted)',
                border: '1px solid var(--color-border-2)',
              }}
            >
              Share anonymously
            </button>
          )}

          {justShared && (
            <span className="text-[12px]" style={{ color: 'var(--color-green)' }}>
              Shared to group chat ✓
            </span>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="text-[12px] px-4 py-1.5 rounded-lg font-medium transition-opacity"
            style={{
              background: canSave ? 'var(--color-violet)' : 'var(--color-border)',
              color: canSave ? '#fff' : 'var(--color-muted)',
              opacity: saving ? 0.6 : 1,
              cursor: canSave && !saving ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving…' : savedId ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      {/* Anonymous share confirmation dialog */}
      {showShareConfirm && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-2)' }}
        >
          <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Share to group chat?
          </p>
          <p className="text-[12px] mb-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Your reflection will be posted as an anonymous question. No one will know it came from you — not your teammates, not admins.
          </p>
          {shareError && (
            <p className="text-[12px] mb-2" style={{ color: 'var(--color-red, #ef4444)' }}>{shareError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowShareConfirm(false); setShareError(null) }}
              className="text-[12px] px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="text-[12px] px-3 py-1.5 rounded-lg font-medium transition-opacity"
              style={{
                background: 'var(--color-violet)',
                color: '#fff',
                opacity: sharing ? 0.6 : 1,
              }}
            >
              {sharing ? 'Sharing…' : 'Share anonymously'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
