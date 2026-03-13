// app/api/projects/[id]/latex/compile/route.ts
// POST: Compile LaTeX via latexonline.cc (GET /compile?text=) or custom JSON compiler

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../../../../lib/auth'
import { parseSectionDoc } from '../../../../../../lib/agents/latexConversionAgent'
import type { FigureCell } from '../../../../../../lib/cell-types'
import { normalizeLatexForCompile, sanitizeLatexAssetFileName } from '../../../../../../lib/latex-assets'
import { prisma } from '../../../../../../lib/prisma'
import { getVirtualCompileAssets } from '../../../../../../lib/latex-template-assets'

type Params = { params: Promise<{ id: string }> }

function extractErrorLine(logs: string) {
  const errorMatch = logs.match(/^.*:(\d+):.*error/mi)
  return errorMatch ? parseInt(errorMatch[1], 10) : undefined
}

type CompileAsset = {
  fileName: string
  fileUrl: string
}

async function appendAssetFile(formData: FormData, fileName: string, fileUrl: string, fieldPath?: string) {
  // Use "file:PATH" as the field name so the local compiler can reconstruct
  // subdirectory paths (e.g. figures/image.png) even though fetch/FormData
  // strips slashes from the filename parameter.
  const fieldName = fieldPath ? `file:${fieldPath}` : 'files[]'

  // Handle base64 data URLs (fallback when uploadthing is not configured)
  if (fileUrl.startsWith('data:')) {
    const [header, base64Data] = fileUrl.split(',')
    const mimeType = header.replace('data:', '').replace(';base64', '')
    const buffer = Buffer.from(base64Data, 'base64')
    formData.append(fieldName, new Blob([buffer], { type: mimeType }), fileName)
    return
  }

  let assetUrl: URL

  try {
    assetUrl = new URL(fileUrl)
  } catch {
    throw new Error(`Invalid asset URL for "${fileName}"`)
  }

  // Some asset providers keep raw spaces in the visible URL; normalize path segments before fetch.
  assetUrl.pathname = assetUrl.pathname
    .split('/')
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join('/')

  const assetRes = await fetch(assetUrl.toString())
  if (!assetRes.ok) {
    throw new Error(`Failed to download "${fileName}" (${assetRes.status})`)
  }

  const contentType = assetRes.headers.get('content-type') || 'application/octet-stream'
  const assetBuffer = await assetRes.arrayBuffer()
  formData.append(fieldName, new Blob([assetBuffer], { type: contentType }), fileName)
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.projectMember.findFirst({ where: { project_id: id, user_id: user.id } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const compilerUrl = process.env.LATEX_COMPILER_URL || process.env.LATEX_COMPILE_URL
    if (!compilerUrl) {
      return NextResponse.json({
        success: false,
        pdfUrl: null,
        logs: 'LATEX_COMPILER_URL is not configured. Set this env var to enable PDF compilation.',
      })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { latexTemplateId: true },
    })

    // Fetch all files for this project
    const files = await prisma.latexFile.findMany({ where: { projectId: id } })
    if (files.length === 0) {
      return NextResponse.json({ error: 'No LaTeX files found. Sync sections first.' }, { status: 400 })
    }

    // Get main .tex content (isMain first, then any CODE file)
    const mainFile = files.find((f) => f.isMain && f.type === 'CODE') ?? files.find((f) => f.type === 'CODE')
    if (!mainFile?.content) {
      return NextResponse.json({ error: 'No main LaTeX file with content found.' }, { status: 400 })
    }

    const compileReady = getVirtualCompileAssets(project?.latexTemplateId, mainFile.content)
    const formData = new FormData()
    formData.append('engine', 'pdflatex')

    const compileFiles = files
      .filter((file) => file.type === 'CODE')
      .filter((file) => {
        if (file.fileName === mainFile.fileName) return true
        if (file.fileName.startsWith('sections/')) return false
        return /\.(tex|bib|sty|cls|bst|bbx|cbx)$/i.test(file.fileName)
      })

    const fileAssets: CompileAsset[] = files
      .filter((file) => file.type !== 'CODE' && file.fileUrl)
      .map((file) => ({ fileName: file.fileName, fileUrl: file.fileUrl as string }))

    const sectionFigureAssets: CompileAsset[] = files
      .filter((file) => file.fileName.startsWith('sections/') && file.content)
      .flatMap((file) =>
        parseSectionDoc(file.content)
          .filter((cell): cell is FigureCell => cell.type === 'figure' && !!cell.fileName && !!cell.fileUrl)
          .map((cell) => ({ fileName: cell.fileName, fileUrl: cell.fileUrl }))
      )

    const assetFiles = [...fileAssets, ...sectionFigureAssets].filter(
      (asset, index, all) =>
        all.findIndex((candidate) => candidate.fileName === asset.fileName && candidate.fileUrl === asset.fileUrl) === index
    )

    const assetPathMap = new Map(assetFiles.map((asset) => [asset.fileName, sanitizeLatexAssetFileName(asset.fileName)]))

    for (const file of compileFiles) {
      const originalContent = file.fileName === mainFile.fileName ? compileReady.mainTex : (file.content ?? '')
      const rewrittenContent = normalizeLatexForCompile(originalContent, assetPathMap)
      // Use "file:PATH" as field name so the server can reconstruct subdirectory paths
      // regardless of fetch/FormData stripping slashes from the filename parameter.
      formData.append(`file:${file.fileName}`, new Blob([rewrittenContent], { type: 'text/plain' }), file.fileName)
    }

    for (const file of compileReady.files) {
      const rewrittenContent = normalizeLatexForCompile(file.content, assetPathMap)
      formData.append(`file:${file.fileName}`, new Blob([rewrittenContent], { type: 'text/plain' }), file.fileName)
    }

    try {
      await Promise.all(
        assetFiles.map((file) => {
          const dest = assetPathMap.get(file.fileName) ?? file.fileName
          return appendAssetFile(formData, dest, file.fileUrl, dest)
        })
      )
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        pdfUrl: null,
        logs: error?.message || 'Failed to prepare LaTeX asset files for compilation.',
      })
    }

    let compileRes: Response
    try {
      compileRes = await fetch(`${compilerUrl.replace(/\/$/, '')}/compile`, {
        method: 'POST',
        body: formData,
      })
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        pdfUrl: null,
        logs: `Failed to reach compiler at ${compilerUrl}: ${err.message}`,
      })
    }

    if (compileRes.status === 404) {
      // GET fallback (e.g. latexonline.cc) — strip \includegraphics lines so the URI stays small
      // and the document compiles without images rather than returning 414.
      let fallbackTex = compileReady.mainTex
      let imagesStripped = false
      if (assetFiles.length > 0) {
        fallbackTex = fallbackTex
          .replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, '% [figure omitted — images not supported by GET compiler]')
          .replace(/\\includegraphics(\[.*?\])?\{[^}]*\}/g, '% [image omitted]')
        imagesStripped = true
      }
      const encoded = encodeURIComponent(fallbackTex)
      try {
        compileRes = await fetch(`${compilerUrl.replace(/\/$/, '')}/compile?text=${encoded}`, {
          method: 'GET',
        })
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          pdfUrl: null,
          logs: `Failed to reach compiler at ${compilerUrl}: ${err.message}`,
        })
      }
      if (imagesStripped) {
        // Tag the response so we can append a warning to the logs later
        ;(compileRes as any)._imagesStripped = true
      }
    }

    const contentType = compileRes.headers.get('content-type') || ''

    // If compiler returned a PDF directly (binary)
    if (compileRes.ok && contentType.includes('application/pdf')) {
      const pdfBuffer = await compileRes.arrayBuffer()
      const base64 = Buffer.from(pdfBuffer).toString('base64')
      const pdfDataUrl = `data:application/pdf;base64,${base64}`

      await prisma.project.update({ where: { id }, data: { pdfUrl: pdfDataUrl } })

      const compileLogs = (compileRes as any)._imagesStripped
        ? 'Compiled successfully. Note: images were omitted because the GET fallback compiler (e.g. latexonline.cc) does not support file uploads. To include images, configure a compiler that accepts multipart/form-data (set LATEX_COMPILER_URL to your self-hosted pdflatex server).'
        : 'Compiled successfully.'
      return NextResponse.json({ success: true, pdfUrl: pdfDataUrl, logs: compileLogs })
    }

    // If compiler returned an error page or non-PDF
    const rawBody = await compileRes.text()

    // Try JSON parse (custom compile server protocol)
    let compileData: any = null
    try {
      compileData = JSON.parse(rawBody)
    } catch {
      // not JSON — show snippet
    }

    if (compileData) {
      const logs: string = compileData.log || compileData.logs || ''
      const success: boolean = compileData.success === true

      if (success && compileData.pdf) {
        const pdfDataUrl = `data:application/pdf;base64,${compileData.pdf}`
        await prisma.project.update({ where: { id }, data: { pdfUrl: pdfDataUrl } })
        return NextResponse.json({ success: true, pdfUrl: pdfDataUrl, logs })
      }

      const errorLine = extractErrorLine(logs)
      return NextResponse.json({ success: false, pdfUrl: null, logs, errorLine })
    }

    // Non-JSON, non-PDF response — likely an error page
    const errorLine = extractErrorLine(rawBody)
    return NextResponse.json({
      success: false,
      pdfUrl: null,
      logs: `Compiler returned HTTP ${compileRes.status} (${contentType}).\n\nResponse preview:\n${rawBody.slice(0, 500)}\n\nCompile assets:\n${[...assetPathMap.entries()].map(([from, to]) => `${from} => ${to}`).join('\n') || '(none)'}`,
      errorLine,
    })
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Internal server error'
    console.error('[POST /latex/compile]', msg)
    return NextResponse.json({ success: false, pdfUrl: null, logs: msg })
  }
}
