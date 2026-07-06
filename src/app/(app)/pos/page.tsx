import { createClient } from '@/lib/supabase/server'
import { PosClient } from './pos-client'

export default async function PosPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return <PosClient initialProducts={products ?? []} />
}
