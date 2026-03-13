import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/integrations/googleClassroom'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // projectId
  if (!code) return NextResponse.redirect(new URL('/dashboard', req.url))

  const accessToken = await exchangeCodeForToken(code)
  const projectId = state || ''

  const response = NextResponse.redirect(new URL(`/project/${projectId}/output?classroomConnected=1`, req.url))
  response.cookies.set('google_access_token', accessToken, { httpOnly: true, maxAge: 3600 })
  return response
}
