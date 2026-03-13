function splitPath(fileName: string) {
  const segments = fileName.split('/').filter(Boolean)
  const rawBaseName = segments.pop() || fileName
  const dir = segments.join('/')
  return { dir, rawBaseName }
}

function sanitizeSegment(segment: string) {
  return segment
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function sanitizeLatexAssetFileName(fileName: string) {
  const { dir, rawBaseName } = splitPath(fileName)
  const extensionIndex = rawBaseName.lastIndexOf('.')
  const name = extensionIndex >= 0 ? rawBaseName.slice(0, extensionIndex) : rawBaseName
  const extension = extensionIndex >= 0 ? rawBaseName.slice(extensionIndex) : ''

  const safeName = sanitizeSegment(name) || 'asset'
  const safeExtension = extension ? extension.replace(/[^a-zA-Z0-9.]/g, '') : ''
  return dir ? `${dir}/${safeName}${safeExtension}` : `${safeName}${safeExtension}`
}

export function toLatexGraphicPath(fileName: string) {
  return fileName
}

export function rewriteLatexAssetPaths(content: string, assetPathMap: Map<string, string>) {
  let next = content

  for (const [originalPath, rewrittenPath] of assetPathMap.entries()) {
    if (originalPath === rewrittenPath) continue
    const escapedOriginal = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    next = next.replace(new RegExp(escapedOriginal, 'g'), rewrittenPath)
  }

  return next
}

export function normalizeLatexForCompile(content: string, assetPathMap: Map<string, string>) {
  let next = rewriteLatexAssetPaths(content, assetPathMap)

  // Rewrite includegraphics paths using the asset map — plain path, no \detokenize wrapper
  next = next.replace(
    /\\includegraphics(\[[^\]]*\])?\{([^}]+)\}/g,
    (_match, options = '', rawPath) => {
      const trimmedPath = rawPath.trim()
      const rewrittenPath = assetPathMap.get(trimmedPath) ?? trimmedPath
      return `\\includegraphics${options}{${rewrittenPath}}`
    }
  )

  // Repair stray "\." sequences that are invalid in plain paragraph text and trigger OT1 accent errors.
  next = next.replace(/\\\.(?=\s|$|[)},;:!?])/g, '.')

  return next
}
