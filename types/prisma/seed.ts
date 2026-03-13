// prisma/seed.ts — Seed script for development

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ResearchCollab database...')

  // Create demo admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@iitdelhi.ac.in' },
    update: {},
    create: {
      email: 'admin@iitdelhi.ac.in',
      full_name: 'Prof. Arjun Sharma',
      affiliation: 'IIT Delhi',
      language: 'en',
    },
  })

  // Create demo member users
  const member1 = await prisma.user.upsert({
    where: { email: 'student1@iitdelhi.ac.in' },
    update: {},
    create: {
      email: 'student1@iitdelhi.ac.in',
      full_name: 'Priya Nair',
      affiliation: 'IIT Delhi',
      language: 'en',
    },
  })

  const member2 = await prisma.user.upsert({
    where: { email: 'student2@imperial.ac.uk' },
    update: {},
    create: {
      email: 'student2@imperial.ac.uk',
      full_name: 'Liam Chen',
      affiliation: 'Imperial College London',
      language: 'en',
    },
  })

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-001' },
    update: {},
    create: {
      id: 'demo-project-001',
      title: 'AI Ethics in STEM Education',
      description: 'A collaborative research paper examining how AI tools are reshaping STEM education and the ethical implications for students and educators.',
      topic: 'AI Ethics in STEM Education',
      status: 'active',
      admin_id: admin.id,
    },
  })

  // Add project members
  await prisma.projectMember.upsert({
    where: { project_id_user_id: { project_id: project.id, user_id: admin.id } },
    update: {},
    create: {
      project_id: project.id,
      user_id: admin.id,
      role: 'admin',
      assigned_subtopic: 'Overview and Framing',
      section_status: 'submitted',
    },
  })

  await prisma.projectMember.upsert({
    where: { project_id_user_id: { project_id: project.id, user_id: member1.id } },
    update: {},
    create: {
      project_id: project.id,
      user_id: member1.id,
      role: 'member',
      assigned_subtopic: 'Bias in AI Assessment Tools',
      section_status: 'in_progress',
    },
  })

  await prisma.projectMember.upsert({
    where: { project_id_user_id: { project_id: project.id, user_id: member2.id } },
    update: {},
    create: {
      project_id: project.id,
      user_id: member2.id,
      role: 'member',
      assigned_subtopic: 'Case Studies: AI in Global STEM Classrooms',
      section_status: 'not_started',
    },
  })

  // Seed a contributorship log entry
  await prisma.contributorshipLog.create({
    data: {
      project_id: project.id,
      user_id: admin.id,
      action: 'created',
      description: 'Project "AI Ethics in STEM Education" created',
    },
  })

  console.log('✅ Seed complete.')
  console.log(`   Admin: ${admin.email}`)
  console.log(`   Member 1: ${member1.email}`)
  console.log(`   Member 2: ${member2.email}`)
  console.log(`   Project: ${project.title} (${project.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
