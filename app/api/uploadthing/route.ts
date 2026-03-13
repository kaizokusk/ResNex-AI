// app/api/uploadthing/route.ts — Uploadthing file upload handler
// Spec Module 9: Reference PDF file storage

import { createRouteHandler } from 'uploadthing/next'
import { ourFileRouter } from '../../../lib/uploadthing'

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
})
