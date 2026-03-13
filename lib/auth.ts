// lib/auth.ts — Auth helper that maps Clerk userId to DB User

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'

/**
 * Gets the current authenticated user from the database.
 * Creates the user record on first login if it doesn't exist.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const { userId } = await auth()
  if (!userId) return null

  // Try to find by clerkId first
  let user = await prisma.user.findFirst({ where: { clerkId: userId } })
  if (user) return user

  // First login: fetch from Clerk and create in DB
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const email = clerkUser.emailAddresses[0]?.emailAddress || ''
  const full_name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0]
  const language = 'en' // will be set client-side

  // Upsert by email (handles edge case of existing user without clerkId)
  user = await prisma.user.upsert({
    where: { email },
    update: { clerkId: userId, avatar_url: clerkUser.imageUrl || undefined },
    create: {
      clerkId: userId,
      email,
      full_name,
      avatar_url: clerkUser.imageUrl || undefined,
      language,
    },
  })

  return user
}
