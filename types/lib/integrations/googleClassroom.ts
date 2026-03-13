export function getGoogleAuthUrl(projectId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/classroom.announcements https://www.googleapis.com/auth/classroom.courses.readonly',
    state: projectId,
    access_type: 'online'
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code'
    })
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token exchange failed')
  return data.access_token
}

export async function getClassrooms(accessToken: string) {
  const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await res.json()
  return data.courses || []
}

export async function postAnnouncement(accessToken: string, courseId: string, text: string, pdfUrl?: string) {
  const body: any = { text }
  if (pdfUrl) body.materials = [{ link: { url: pdfUrl, title: 'Final Paper PDF' } }]
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/announcements`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`Classroom post failed: ${res.status}`)
  return res.json()
}
