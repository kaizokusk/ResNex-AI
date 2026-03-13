// app/api/projects/[id]/output/pdf/route.ts
// Returns the merged_content as a downloadable text/plain for PDF generation
// (Client-side jsPDF handles actual rendering; this endpoint provides the content URL)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const output = await prisma.finalOutput.findUnique({ where: { project_id: id } })
  const project = await prisma.project.findUnique({ where: { id }, select: { pdfUrl: true } })
  if (!output?.merged_content) {
    return NextResponse.json({ 
      error: 'No merged content found. Run merge first.'
     }, { status: 404 })
  }

  // Return the content — client uses jsPDF to render
  return NextResponse.json({ pdf_url: null, content: output.merged_content })
}
