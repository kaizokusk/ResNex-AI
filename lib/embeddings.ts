// lib/embeddings.ts
// Feature 4: PDF text extraction, chunking, and HuggingFace embedding pipeline

import { prisma } from './prisma'

const HF_EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2'

// ---------------------------------------------------------------------------
// PDF text extraction using pdf-parse
// ---------------------------------------------------------------------------
export async function extractTextFromPDF(url: string): Promise<string> {
  // pdf-parse v2 uses a class-based API: new PDFParse({ data: buffer })
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse')

  // arXiv and other academic servers block requests without a browser User-Agent
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ResearchCollab/1.0; +https://github.com/researchcollab)',
      'Accept': 'application/pdf,*/*',
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status} ${url}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return result.text
}

// ---------------------------------------------------------------------------
// Split text into 500-word chunks with 50-word overlap
// ---------------------------------------------------------------------------
export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  const chunkSize = 500
  const overlap = 50

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim()) chunks.push(chunk)
    if (i + chunkSize >= words.length) break
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Embed a text chunk using HuggingFace Inference API
// Returns a 384-dimensional vector
// ---------------------------------------------------------------------------
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_KEY is not set')

  const res = await fetch(
    `https://router.huggingface.co/hf-inference/models/${HF_EMBEDDING_MODEL}/pipeline/feature-extraction`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ inputs: text }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HuggingFace embedding error ${res.status}: ${text}`)
  }

  const data = await res.json()
  // The API returns an array of embeddings; we pass one input so take the first
  return Array.isArray(data[0]) ? data[0] : data
}

// ---------------------------------------------------------------------------
// Full pipeline: extract → chunk → embed → store in DB
// ---------------------------------------------------------------------------
export async function indexDocument(
  projectId: string,
  memberId: string,
  fileName: string,
  fileUrl: string,
  preExtractedText?: string
): Promise<void> {
  const text = preExtractedText || (await extractTextFromPDF(fileUrl))
  const chunks = chunkText(text)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    let embedding: number[] | null = null
    try {
      embedding = await embedText(chunk)
    } catch (err) {
      console.error(`[embeddings] failed to embed chunk ${i}:`, err)
    }

    if (embedding) {
      // Use raw SQL to insert with pgvector type
      const vectorStr = `[${embedding.join(',')}]`
      await prisma.$executeRawUnsafe(
        `INSERT INTO document_chunks ("id", "projectId", "memberId", "fileName", "fileUrl", "chunkIndex", "content", "embedding", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::vector, NOW())`,
        projectId,
        memberId,
        fileName,
        fileUrl,
        i,
        chunk,
        vectorStr
      )
    } else {
      // Store without embedding if HF failed
      await prisma.documentChunk.create({
        data: { projectId, memberId, fileName, fileUrl, chunkIndex: i, content: chunk },
      })
    }
  }
}
