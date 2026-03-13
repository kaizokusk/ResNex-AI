// app/api/projects/[id]/latex/transfer/route.ts
// POST: Convert content to LaTeX and append to a target file

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { transferConvert } from '../../../../../../lib/agents/transferAgent'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content, contentType, targetFile = 'main.tex', targetSection, sourceMessageId, fileName } = await req.json()

  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const validTypes = ['text', 'image', 'table', 'equation']
  if (!validTypes.includes(contentType)) {
    return NextResponse.json({ error: `contentType must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  // Convert content to LaTeX snippet
  const { latex, label } = await transferConvert({ content, contentType, targetSection, fileName })

  // Find or create target file
  let file = await prisma.latexFile.findUnique({
    where: { projectId_fileName: { projectId: id, fileName: targetFile } },
  })

  if (!file) {
    // Auto-create the target file if it doesn't exist
    file = await prisma.latexFile.create({
      data: {
        projectId: id,
        fileName: targetFile,
        type: 'CODE',
        content: '',
        isMain: targetFile === 'main.tex',
      },
    })
  }

  // Append LaTeX snippet before \end{document} if it exists, otherwise just append
  const existing = file.content ?? ''
  let newContent: string
  if (existing.includes('\\end{document}')) {
    newContent = existing.replace('\\end{document}', `\n${latex}\n\\end{document}`)
  } else {
    newContent = existing + '\n' + latex
  }

  const updated = await prisma.latexFile.update({
    where: { id: file.id },
    data: { content: newContent },
  })

  return NextResponse.json({ inserted: latex, label, file: updated })
}
