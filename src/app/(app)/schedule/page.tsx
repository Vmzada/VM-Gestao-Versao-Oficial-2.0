import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { ScheduleClient } from './schedule-client'

export default async function SchedulePage() {
  const supabase = await createClient()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const [bookingsRes, courtsRes] = await Promise.all([
    supabase
      .from('court_bookings')
      .select('*, courts(name, type)')
      .eq('booking_date', todayStr)
      .order('start_time', { ascending: true }),
    supabase
      .from('courts')
      .select('id, name, type, price_per_hour')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  return (
    <ScheduleClient
      initialDate={todayStr}
      initialBookings={bookingsRes.data ?? []}
      courts={courtsRes.data ?? []}
    />
  )
}
