import { createClient } from '@/lib/supabase/server'
import { ProductsClient } from './products-client'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: products } = await supabase.from('products').select('*').order('name', { ascending: true })

  return <ProductsClient initialProducts={products ?? []} />
}
