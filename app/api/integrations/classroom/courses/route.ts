import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getClassrooms } from '@/lib/integrations/googleClassroom'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = req.cookies.get('google_access_token')?.value
  if (!accessToken) return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 })

  const courses = await getClassrooms(accessToken)
  return NextResponse.json({ courses })
}
