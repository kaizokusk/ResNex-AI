'use client'
// app/project/[id]/review/page.tsx

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { Avatar, Button, Badge, Card, Spinner, ToastProvider, useToast } from '../../../../components/ui'

function SectionViewer({ section }: { section: any }) {
  let content = section.content
  try {
    const parsed = JSON.parse(section.content)
    // Rough TipTap JSON to HTML conversion
    content = parsed.content?.map((node: any) => {
      if (node.type === 'paragraph') return `<p>${node.content?.map((c: any) => c.text || '').join('') || ''}</p>`
      if (node.type === 'heading') return `<h${node.attrs?.level || 2}>${node.content?.map((c: any) => c.text || '').join('')}</h${node.attrs?.level || 2}>`
      if (node.type === 'bulletList') return `<ul>${node.content?.map((item: any) => `<li>${item.content?.map((p: any) => p.content?.map((c: any) => c.text || '').join('')).join('')}</li>`).join('')}</ul>`
      return ''
    }).join('') || content
  } catch { }

  return (
    <div
      className="prose prose-invert max-w-none text-sm text-[#c8cad0] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

function CommentThread({ sectionId, projectId }: { sectionId: string; projectId: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const { error, success } = useToast()

  useEffect(() => {
    fetch(`/api/projects/${projectId}/sections/${sectionId}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(setComments)
      .catch(console.error)
  }, [sectionId])

  async function addComment(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.status === 422) {
        const data = await res.json()
        error(data.message || 'Message flagged by moderation')
        return
      }
      const comment = await res.json()
      setComments(prev => [...prev, comment])
      setText('')
      success('Comment added')
    } catch { error('Failed to add comment') }
    finally { setSending(false) }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#1a1f2e]">
      <p className="text-xs font-semibold text-[#7a839a] uppercase tracking-wider mb-3">Comments</p>
      <div className="flex flex-col gap-2 mb-3">
        {comments.map((c, i) => (
          <div key={i} className="flex gap-2">
            {c.user && <Avatar name={c.user.full_name} size={24} />}
            <div className="flex-1 bg-[#0a0c10] rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-[#7a839a] mb-0.5">{c.user?.full_name}</p>
              <p className="text-xs text-[#c8cad0]">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-[#3d4558]">No comments yet.</p>}
      </div>
      <form onSubmit={addComment} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-[#0a0c10] border border-[#252a38] rounded-lg px-3 py-1.5 text-xs
            text-[#e8eaf0] placeholder:text-[#3d4558] focus:outline-none focus:border-[#4f8ef7]"
        />
        <Button type="submit" size="sm" loading={sending} disabled={!text.trim()}>Post</Button>
      </form>
    </div>
  )
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [approved, setApproved] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/projects/${id}/sections`)
      .then(r => r.json())
      .then(setSections)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const tabs = [
    { label: 'Overview', href: `/project/${id}` },
    { label: 'Chat', href: `/project/${id}/chat` },
    { label: 'Discover', href: `/project/${id}/discover` },
    { label: 'Library', href: `/project/${id}/library` },
    { label: 'Agents', href: `/project/${id}/agents` },
    { label: 'LaTeX', href: `/project/${id}/latex` },
  ]

  return (
    <>
      <ToastProvider />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="Peer Review"
          subtitle="Read your teammates' submitted sections"
          tabs={tabs}
          activeTab={`/project/${id}/review`}
        />
        <div className="flex-1 overflow-y-auto p-8 bg-[#0a0c10]">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Spinner size={24} /></div>
          ) : sections.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7a839a]">No sections submitted yet.</p>
              <p className="text-xs text-[#3d4558] mt-2">Members need to submit their sections first.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-8">
              {sections.map((section, i) => (
                <Card key={section.id} className={`animate-fade-up delay-${i + 1}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {section.member && <Avatar name={section.member.full_name} size={32} />}
                      <div>
                        <p className="font-semibold text-sm text-[#e8eaf0]">{section.member?.full_name}</p>
                        <p className="text-xs text-[#7a839a]">{section.subtopic}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="gray">{section.word_count} words</Badge>
                      {approved.has(section.id) ? (
                        <Badge color="green">✓ Approved</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setApproved(prev => new Set([...prev, section.id]))}
                        >
                          Mark Reviewed
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#0a0c10] rounded-lg p-5 border border-[#1a1f2e]">
                    <SectionViewer section={section} />
                  </div>
                  <CommentThread sectionId={section.id} projectId={id} />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
