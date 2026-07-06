import { AlertTriangle, CalendarClock, DollarSign } from 'lucide-react'
import { endOfDay, format, startOfDay, startOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_VARIANT, formatCurrency, formatLocalDateShort } from '@/lib/utils'
import { StatCard } from './stat-card'
import { RevenueChart } from './revenue-chart'
import { RevenueFilterCard } from './revenue-filter-card'

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)
  const chartRangeStart = startOfDay(subDays(now, 6))
  const todayStr = format(now, 'yyyy-MM-dd')

  const [chartSalesRes, monthSalesRes, lowStockRes, bookingsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('total_amount, created_at')
      .gte('created_at', chartRangeStart.toISOString())
      .neq('status', 'cancelada'),
    supabase
      .from('sales')
      .select('total_amount, created_at, status')
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'cancelada'),
    supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock_quantity, unit')
      .eq('is_active', true),
    supabase
      .from('court_bookings')
      .select('id, customer_name, booking_date, start_time, end_time, status, courts(name, type)')
      .gte('booking_date', todayStr)
      .neq('status', 'cancelada')
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5),
  ])

  const chartSales = chartSalesRes.data ?? []
  const monthSales = monthSalesRes.data ?? []
  const lowStockProducts = (lowStockRes.data ?? []).filter((p) => p.stock_quantity <= p.min_stock_quantity)
  const upcomingBookings = bookingsRes.data ?? []

  const todaySales = chartSales.filter((s) => {
    const createdAt = new Date(s.created_at)
    return createdAt >= todayStart && createdAt <= todayEnd
  })
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total_amount, 0)
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total_amount, 0)

  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const day = subDays(now, 6 - index)
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    const total = chartSales
      .filter((s) => {
        const createdAt = new Date(s.created_at)
        return createdAt >= dayStart && createdAt <= dayEnd
      })
      .reduce((sum, s) => sum + s.total_amount, 0)

    return { label: format(day, 'EEE dd/MM', { locale: ptBR }), total }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Visão geral do seu negócio.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Vendas hoje"
          value={formatCurrency(todayTotal)}
          hint={`${todaySales.length} venda${todaySales.length === 1 ? '' : 's'}`}
          icon={DollarSign}
        />
        <RevenueFilterCard initialTotal={monthTotal} initialCount={monthSales.length} />
        <StatCard
          label="Estoque baixo"
          value={String(lowStockProducts.length)}
          hint={lowStockProducts.length > 0 ? 'produtos precisam de reposição' : 'tudo em dia'}
          icon={AlertTriangle}
          tone={lowStockProducts.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Próximas reservas"
          value={String(upcomingBookings.length)}
          hint="quadras agendadas"
          icon={CalendarClock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento — últimos 7 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estoque baixo</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto com estoque baixo.</p>
            ) : (
              <ul className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <li key={product.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground">
                      {product.stock_quantity} / {product.min_stock_quantity} {product.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reserva agendada.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.courts?.name} · {formatLocalDateShort(booking.booking_date)} ·{' '}
                        {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant={BOOKING_STATUS_VARIANT[booking.status]}>
                      {BOOKING_STATUS_LABEL[booking.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
