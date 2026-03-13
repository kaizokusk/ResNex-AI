export async function callInternVL2(imageUrl: string, prompt: string): Promise<string> {
  const res = await fetch(imageUrl)
  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = res.headers.get('content-type') || 'image/jpeg'
  const hfRes = await fetch(`https://api-inference.huggingface.co/models/${process.env.HF_VISION_MODEL}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.HF_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: { image: `data:${mimeType};base64,${base64}`, text: prompt } })
  })
  if (!hfRes.ok) throw new Error(`InternVL2 failed: ${hfRes.status}`)
  const data = await hfRes.json()
  return data[0]?.generated_text || 'Figure showing experimental results.'
}
