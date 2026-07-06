import { createClient } from '@/lib/supabase/server'
import { CourtsClient } from './courts-client'

export default async function CourtsPage() {
  const supabase = await createClient()
  const { data: courts } = await supabase.from('courts').select('*').order('name', { ascending: true })

  return <CourtsClient initialCourts={courts ?? []} />
}
