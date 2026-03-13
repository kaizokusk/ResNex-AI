export async function callPix2Tex(imageUrlOrBase64: string): Promise<string> {
  let base64: string
  if (imageUrlOrBase64.startsWith('http')) {
    const res = await fetch(imageUrlOrBase64)
    const buffer = await res.arrayBuffer()
    base64 = Buffer.from(buffer).toString('base64')
  } else {
    base64 = imageUrlOrBase64.replace(/^data:image\/\w+;base64,/, '')
  }
  const res = await fetch(`${process.env.PIX2TEX_API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 })
  })
  if (!res.ok) throw new Error(`pix2tex failed: ${res.status}`)
  const data = await res.json()
  return data.latex as string
}
