// lib/pollinations.ts — Image generation helper via Pollinations.ai (free, no API key)

/**
 * Generate an image URL from a text prompt using Pollinations.ai.
 * No API key required. Returns a stable URL that serves the generated image.
 */
export function generateImageUrl(prompt: string, options?: {
  width?: number
  height?: number
  seed?: number
  model?: string
  nologo?: boolean
}): string {
  const {
    width = 1024,
    height = 768,
    seed,
    model = 'flux',
    nologo = true,
  } = options || {}

  const encodedPrompt = encodeURIComponent(prompt)
  const params = new URLSearchParams()

  params.set('width', String(width))
  params.set('height', String(height))
  params.set('model', model)
  if (nologo) params.set('nologo', 'true')
  if (seed !== undefined) params.set('seed', String(seed))

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`
}

/**
 * Generate a visual summary prompt for a research project,
 * then return the Pollinations image URL.
 */
export async function generateVisualSummary(params: {
  topic: string
  mergedContent: string
}): Promise<string> {
  // Build a descriptive prompt for an academic infographic
  const prompt = `Academic research infographic about ${params.topic}. 
    Scientific illustration style, clean and professional, 
    data visualization elements, charts and diagrams, 
    blue and white color scheme, modern academic poster design`

  return generateImageUrl(prompt, {
    width: 1200,
    height: 800,
    nologo: true,
  })
}

/**
 * Generate an image from user-provided prompt (workspace image generator)
 */
export function generateWorkspaceImage(userPrompt: string): string {
  return generateImageUrl(userPrompt, {
    width: 800,
    height: 600,
    nologo: true,
  })
}
