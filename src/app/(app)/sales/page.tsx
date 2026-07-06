import { endOfDay, format, startOfDay } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { SalesClient } from './sales-client'

export default async function SalesPage() {
  const supabase = await createClient()

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const todayStr = format(now, 'yyyy-MM-dd')

  const [salesRes, bookingsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('id, total_amount, payment_method, status, created_at')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('court_bookings')
      .select('id, customer_name, booking_date, status, total_amount, courts(name, type)')
      .gte('booking_date', todayStr)
      .lte('booking_date', todayStr)
      .order('booking_date', { ascending: false }),
  ])

  return <SalesClient initialSales={salesRes.data ?? []} initialBookings={bookingsRes.data ?? []} />
}
