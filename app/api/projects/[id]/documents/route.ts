// app/api/projects/[id]/documents/route.ts
// Feature 4: Trigger document indexing after upload + list indexed documents

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import { indexDocument } from '../../../../../lib/embeddings'

// POST /api/projects/[id]/documents — index an uploaded PDF
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { fileName, fileUrl } = body

  if (!fileName || !fileUrl) {
    return NextResponse.json({ error: 'fileName and fileUrl are required' }, { status: 400 })
  }

  // Run indexing in the background — don't block the response
  indexDocument(id, user.id, fileName, fileUrl).catch((err) =>
    console.error('[documents] indexing failed:', err)
  )

  return NextResponse.json({ status: 'indexing_started', fileName }, { status: 202 })
}

// GET /api/projects/[id]/documents — list indexed documents
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.projectMember.findFirst({
    where: { project_id: id, user_id: user.id },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Return distinct files (one entry per file, not per chunk)
  const docs = await prisma.$queryRawUnsafe<{ fileName: string; fileUrl: string; createdAt: Date }[]>(
    `SELECT DISTINCT "fileName", "fileUrl", MIN("createdAt") AS "createdAt"
     FROM document_chunks
     WHERE "projectId" = $1
     GROUP BY "fileName", "fileUrl"
     ORDER BY MIN("createdAt") DESC`,
    id
  )

  return NextResponse.json(docs)
}
