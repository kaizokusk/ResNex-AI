'use client'
// components/workspace/TipTapEditor.tsx
// Isolated client component for TipTap — avoids SSR issues with dynamic import

import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface TipTapEditorProps {
  initialContent?: any
  onChange?: (json: any, wordCount: number) => void
  readOnly?: boolean
}

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null
  const btn = (action: () => void, active: boolean, label: string, content: React.ReactNode) => (
    <button
      onClick={action}
      title={label}
      className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors
        ${active ? 'bg-[#4f8ef7]/20 text-[#4f8ef7]' : 'text-[#7a839a] hover:text-[#e8eaf0] hover:bg-[#1a1f2e]'}`}
    >
      {content}
    </button>
  )
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-[#252a38] flex-wrap bg-[#0d1018]">
      {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold', <b>B</b>)}
      {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic', <i>I</i>)}
      <div className="w-px h-4 bg-[#252a38] mx-1" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), 'H1', 'H1')}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'H2', 'H2')}
      <div className="w-px h-4 bg-[#252a38] mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet list', '•')}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered list', '1.')}
      <div className="w-px h-4 bg-[#252a38] mx-1" />
      {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Quote', '"')}
      {btn(() => editor.chain().focus().toggleCode().run(), editor.isActive('code'), 'Code', '<>')}
    </div>
  )
}

export default function TipTapEditor({ initialContent, onChange, readOnly = false }: TipTapEditorProps) {
  const initialSet = useRef(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: !readOnly,
    editorProps: { attributes: { class: 'tiptap min-h-full outline-none' } },
    onUpdate({ editor }) {
      if (!onChange) return
      const text = editor.getText()
      const wc = text.trim().split(/\s+/).filter(Boolean).length
      onChange(editor.getJSON(), wc)
    },
  })

  // Set initial content once editor is ready
  useEffect(() => {
    if (editor && initialContent && !initialSet.current) {
      initialSet.current = true
      try {
        const parsed = typeof initialContent === 'string' ? JSON.parse(initialContent) : initialContent
        editor.commands.setContent(parsed)
      } catch {
        editor.commands.setContent(initialContent || '')
      }
    }
  }, [editor, initialContent])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!readOnly && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  )
}
