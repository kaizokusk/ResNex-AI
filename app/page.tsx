// app/page.tsx — Root redirect
import { redirect } from 'next/navigation'
export default function Root() {
  redirect('/dashboard')
}
