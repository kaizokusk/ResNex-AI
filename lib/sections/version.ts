// lib/sections/version.ts — snapshot saving + diff logic
import { prisma } from '@/lib/prisma'

export interface Version {
  content: string
  savedAt: string  // ISO string
  wordCount: number
  savedBy: string  // userId
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function saveVersion(sectionId: string, content: string, userId: string): Promise<void> {
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) return

  const versions = (section.versions as unknown as Version[]) || []
  const newVersion: Version = {
    content,
    savedAt: new Date().toISOString(),
    wordCount: countWords(content),
    savedBy: userId,
  }
  const updated = [...versions, newVersion].slice(-5)
  await prisma.section.update({
    where: { id: sectionId },
    data: { versions: updated as any },
  })
}

export function computeDiff(oldContent: string, newContent: string): {
  added: number
  removed: number
  wordDelta: string
} {
  const oldWords = oldContent.trim().split(/\s+/).filter(Boolean)
  const newWords = newContent.trim().split(/\s+/).filter(Boolean)
  const added = Math.max(0, newWords.length - oldWords.length)
  const removed = Math.max(0, oldWords.length - newWords.length)
  const net = newWords.length - oldWords.length
  return { added, removed, wordDelta: `${net >= 0 ? '+' : ''}${net} words` }
}

export async function getVersions(sectionId: string): Promise<Version[]> {
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) return []
  return (section.versions as unknown as Version[]) || []
}

export async function restoreVersion(sectionId: string, versionIndex: number, userId: string): Promise<string> {
  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) throw new Error('Section not found')

  const versions = (section.versions as unknown as Version[]) || []
  const target = versions[versionIndex]
  if (!target) throw new Error('Version not found')

  // Save current as a new version before restoring
  await saveVersion(sectionId, section.content, userId)

  // Restore
  await prisma.section.update({
    where: { id: sectionId },
    data: { content: target.content, word_count: target.wordCount },
  })

  return target.content
}
