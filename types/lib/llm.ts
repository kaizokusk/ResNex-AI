// lib/llm.ts — Unified LLM abstraction: Ollama | HuggingFace | DeepSeek | Claude (default)
// All agents import callLLM from here instead of lib/claude.ts

import Anthropic from '@anthropic-ai/sdk'

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMOptions {
  messages: LLMMessage[]
  system?: string
  maxTokens?: number
  modelOverride?: string
  language?: string // appends lang note to system prompt
}

export interface LLMVisionOptions {
  imageUrls: string[]
  textPrompt: string
  system?: string
  maxTokens?: number
}

// Re-export parseJsonResponse so callers that imported it from claude.ts can switch over
export function parseJsonResponse<T>(raw: string): T {
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  return JSON.parse(clean) as T
}

/** Vision-capable call — sends image URLs as actual image content blocks.
 *  Uses HuggingFace if LLM_PROVIDER=huggingface, otherwise Claude. */
export async function callLLMVision(options: LLMVisionOptions): Promise<string> {
  const { imageUrls, textPrompt, system, maxTokens = 4096 } = options
  const provider = process.env.LLM_PROVIDER || 'claude'

  if (provider === 'deepseek') {
    // DeepSeek-V3 doesn't support image inputs — fall back to text-only with URLs mentioned
    const urlContext = imageUrls.map((u, i) => `Image ${i + 1}: ${u}`).join('\n')
    return callDeepSeek({
      messages: [{ role: 'user', content: `${urlContext}\n\n${textPrompt}` }],
      system,
      maxTokens,
    })
  }

  if (provider === 'huggingface') {
    // HuggingFace vision: pass image URLs as inline image_url content blocks (OpenAI-compatible format)
    const hfModel = process.env.HF_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct'
    const apiKey = process.env.HUGGINGFACE_KEY
    if (!apiKey) throw new Error('HUGGINGFACE_KEY is not set')

    const userContent = [
      ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
      { type: 'text', text: textPrompt },
    ]
    const messages: any[] = []
    if (system) messages.push({ role: 'system', content: system })
    messages.push({ role: 'user', content: userContent })

    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: hfModel, messages, max_tokens: maxTokens }),
    })
    if (!res.ok) throw new Error(`HuggingFace vision error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  // Default: Claude vision
  const model = process.env.LLM_MODEL || 'claude-sonnet-4-6'
  const content: Anthropic.MessageParam['content'] = [
    ...imageUrls.map((url): Anthropic.ImageBlockParam => ({
      type: 'image',
      source: { type: 'url', url },
    })),
    { type: 'text', text: textPrompt },
  ]

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system && { system }),
    messages: [{ role: 'user', content }],
  })

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('')
}

export async function callLLM(options: LLMOptions): Promise<string> {
  const provider = process.env.LLM_PROVIDER || 'claude'

  const { messages, system, maxTokens = 4096, modelOverride, language } = options

  // Append language note to system prompt if needed
  const langNote =
    language && language !== 'en'
      ? `\n\nIMPORTANT: Respond in the user's language: ${language}.`
      : ''
  const systemFinal = system ? system + langNote : langNote || undefined

  if (provider === 'ollama') {
    return callOllama({ messages, system: systemFinal, maxTokens, modelOverride })
  }
  if (provider === 'huggingface') {
    return callHuggingFace({ messages, system: systemFinal, maxTokens, modelOverride })
  }
  if (provider === 'deepseek') {
    return callDeepSeek({ messages, system: systemFinal, maxTokens, modelOverride })
  }
  // Default: Claude
  return callClaude({ messages, system: systemFinal, maxTokens, modelOverride })
}

// ---------------------------------------------------------------------------
// Ollama provider
// ---------------------------------------------------------------------------
async function callOllama(opts: {
  messages: LLMMessage[]
  system?: string
  maxTokens: number
  modelOverride?: string
}): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const model = opts.modelOverride || process.env.OLLAMA_MODEL || 'llama3'

  const allMessages: LLMMessage[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...opts.messages]
    : opts.messages

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: allMessages, stream: false }),
  })

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  return data.message?.content ?? ''
}

// ---------------------------------------------------------------------------
// HuggingFace Inference API provider
// ---------------------------------------------------------------------------
async function callHuggingFace(opts: {
  messages: LLMMessage[]
  system?: string
  maxTokens: number
  modelOverride?: string
}): Promise<string> {
  const model = opts.modelOverride || process.env.HF_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1'
  const apiKey = process.env.HUGGINGFACE_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_KEY is not set')
  const keySuffix = apiKey.slice(-4) // safe for logs/debug

  const allMessages: LLMMessage[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...opts.messages]
    : opts.messages

  const doRequest = async () =>
    fetch(`https://router.huggingface.co/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: opts.maxTokens,
      }),
    })

  let res = await doRequest()
  if (res.status === 429) {
    // Rate limit — one retry after 2 seconds
    await new Promise((r) => setTimeout(r, 2000))
    res = await doRequest()
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // HF router uses 402 to signal Inference Providers usage/billing issues.
    if (res.status === 402) {
      throw new Error(
        `HuggingFace router 402 (billing/usage) for model "${model}" (key …${keySuffix}). ` +
          `Try a smaller HF_MODEL or enable Inference Providers credits. Details: ${body.slice(0, 300)}`
      )
    }
    throw new Error(`HuggingFace error ${res.status} (model "${model}", key …${keySuffix}): ${body}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ---------------------------------------------------------------------------
// DeepSeek provider (OpenAI-compatible API)
// ---------------------------------------------------------------------------
async function callDeepSeek(opts: {
  messages: LLMMessage[]
  system?: string
  maxTokens: number
  modelOverride?: string
}): Promise<string> {
  const model = opts.modelOverride || process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not set')

  const allMessages: any[] = []
  if (opts.system) allMessages.push({ role: 'system', content: opts.system })
  allMessages.push(...opts.messages)

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: allMessages, max_tokens: opts.maxTokens }),
  })

  if (!res.ok) throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ---------------------------------------------------------------------------
// Claude provider (default)
// ---------------------------------------------------------------------------
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function callClaude(opts: {
  messages: LLMMessage[]
  system?: string
  maxTokens: number
  modelOverride?: string
}): Promise<string> {
  const model = opts.modelOverride || process.env.LLM_MODEL || 'claude-sonnet-4-6'

  // Claude only accepts 'user' | 'assistant' roles (not 'system')
  const messages = opts.messages.filter((m) => m.role !== 'system') as {
    role: 'user' | 'assistant'
    content: string
  }[]

  const response = await anthropic.messages.create({
    model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages,
  })

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
}
