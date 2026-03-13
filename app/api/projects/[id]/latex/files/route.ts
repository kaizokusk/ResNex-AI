// app/api/projects/[id]/latex/files/route.ts
// GET: list all LatexFile records for project
// POST: create a new LatexFile (CODE or IMAGE/DATA)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { sanitizeLatexAssetFileName } from '../../../../../../lib/latex-assets'
import { prisma } from '../../../../../../lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const files = await prisma.latexFile.findMany({
    where: { projectId: id },
    orderBy: [{ type: 'asc' }, { fileName: 'asc' }],
  })

  return NextResponse.json(files)
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { fileName, type, content, fileUrl, isMain } = await req.json()

  if (!fileName || !type) {
    return NextResponse.json({ error: 'fileName and type are required' }, { status: 400 })
  }

  const validTypes = ['CODE', 'IMAGE', 'DATA']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  if ((type === 'IMAGE' || type === 'DATA') && !fileUrl) {
    return NextResponse.json({ error: 'fileUrl is required for IMAGE and DATA files' }, { status: 400 })
  }

  const normalizedFileName = type === 'CODE' ? fileName : sanitizeLatexAssetFileName(fileName)

  // Check unique fileName within project (use normalized name for non-code assets).
  const existing = await prisma.latexFile.findUnique({
    where: { projectId_fileName: { projectId: id, fileName: normalizedFileName } },
  })
  if (existing) {
    return NextResponse.json(
      { error: `A file named "${normalizedFileName}" already exists in this project` },
      { status: 409 }
    )
  }

  // If setting as main, unset any existing main file
  if (isMain) {
    await prisma.latexFile.updateMany({
      where: { projectId: id, isMain: true },
      data: { isMain: false },
    })
  }

  const file = await prisma.latexFile.create({
    data: {
      projectId: id,
      fileName: normalizedFileName,
      type,
      content: type === 'CODE' ? (content ?? '') : null,
      fileUrl: fileUrl ?? null,
      isMain: isMain ?? false,
    },
  })

  return NextResponse.json(file, { status: 201 })
}
