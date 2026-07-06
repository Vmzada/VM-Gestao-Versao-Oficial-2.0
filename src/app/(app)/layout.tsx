import { Shell } from '@/components/layout/Shell'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) {
      const metadata = user.user_metadata as { business_name?: string; owner_name?: string; phone?: string }
      await supabase.from('profiles').insert({
        user_id: user.id,
        business_name: metadata.business_name || 'Meu negócio',
        owner_name: metadata.owner_name || user.email || 'Proprietário',
        phone: metadata.phone || null,
      })
    }
  }

  return <Shell>{children}</Shell>
}
