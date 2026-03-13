// lib/semanticSearch.ts
// Feature 4: pgvector cosine similarity search over uploaded document chunks

import { prisma } from './prisma'
import { embedText } from './embeddings'

export interface SearchResult {
  content: string
  fileName: string
  similarity: number
}

/**
 * Embed the query and find the top-K most similar document chunks
 * using pgvector cosine distance (1 - cosine_distance = cosine_similarity).
 */
export async function searchDocuments(
  projectId: string,
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedText(query)
  } catch (err) {
    console.error('[semanticSearch] embed query failed:', err)
    return []
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`

  try {
    const results = await prisma.$queryRawUnsafe<
      { content: string; fileName: string; similarity: number }[]
    >(
      `SELECT content, "fileName", 1 - (embedding <=> $1::vector) AS similarity
       FROM document_chunks
       WHERE "projectId" = $2 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      projectId,
      topK
    )

    return results
  } catch (err) {
    console.error('[semanticSearch] query failed:', err)
    return []
  }
}
