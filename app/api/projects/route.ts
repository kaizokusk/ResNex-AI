// api/projects/route.ts — GET all projects, POST create project

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

// GET /api/projects — all projects for current user
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const memberships = await prisma.projectMember.findMany({
      where: { user_id: user.id },
      include: {
        project: {
          include: {
            admin: { select: { id: true, full_name: true, email: true } },
            members: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } },
          },
        },
      },
      orderBy: { joined_at: 'desc' },
    })

    // Deduplicate by project id — guards against duplicate ProjectMember rows
    const seen = new Set<string>()
    const projects = memberships
      .filter((m) => {
        if (seen.has(m.project_id)) return false
        seen.add(m.project_id)
        return true
      })
      .map((m) => ({
        ...m.project,
        myRole: m.role,
        myStatus: m.section_status,
      }))

    return NextResponse.json(projects)
  } catch (err: any) {
    console.error('[GET /api/projects]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects — create new project (admin)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, description, topic } = body

    if (!title || !description || !topic) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        topic,
        admin_id: user.id,
      },
    })

    // Auto-add creator as admin member
    await prisma.projectMember.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        role: 'admin',
      },
    })

    // Log creation
    await prisma.contributorshipLog.create({
      data: {
        project_id: project.id,
        user_id: user.id,
        action: 'created',
        description: `Project "${title}" created`,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/projects]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
