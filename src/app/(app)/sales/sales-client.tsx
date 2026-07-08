'use client'

import { useMemo, useRef, useState } from 'react'
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DollarSign, Package, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_VARIANT, formatCurrency, formatLocalDateShort, parseLocalDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type SaleRow = {
  id: string
  total_amount: number
  payment_method: string
  status: string
  created_at: string
}

type BookingRow = {
  id: string
  customer_name: string
  booking_date: string
  status: string
  total_amount: number
  courts: { name: string; type: string } | null
}

type Preset = 'today' | 'yesterday' | 'last7' | 'month'

const PRESETS: [Preset, string][] = [
  ['today', 'Hoje'],
  ['yesterday', 'Ontem'],
  ['last7', 'Últimos 7 dias'],
  ['month', 'Este mês'],
]

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
}

function paymentLabel(method: string) {
  return PAYMENT_LABELS[method.toLowerCase()] ?? method
}

export function SalesClient({
  initialSales,
  initialBookings,
}: {
  initialSales: SaleRow[]
  initialBookings: BookingRow[]
}) {
  const [sales, setSales] = useState(initialSales)
  const [bookings, setBookings] = useState(initialBookings)
  const [activePreset, setActivePreset] = useState<Preset | null>('today')
  const [rangeLabel, setRangeLabel] = useState('Hoje')
  const [customDay, setCustomDay] = useState('')
  const [customMonth, setCustomMonth] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  const fetchData = async (start: Date, end: Date) => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    const startDateStr = format(start, 'yyyy-MM-dd')
    const endDateStr = format(end, 'yyyy-MM-dd')

    const [salesRes, bookingsRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, total_amount, payment_method, status, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('court_bookings')
        .select('id, customer_name, booking_date, status, total_amount, courts(name, type)')
        .gte('booking_date', startDateStr)
        .lte('booking_date', endDateStr)
        .order('booking_date', { ascending: false }),
    ])

    // Ignore this response if a newer filter selection already superseded it.
    if (requestId !== requestIdRef.current) return

    setIsLoading(false)
    if (!salesRes.error) setSales(salesRes.data ?? [])
    if (!bookingsRes.error) setBookings(bookingsRes.data ?? [])
  }

  const applyPreset = (preset: Preset) => {
    const now = new Date()
    setCustomDay('')
    setCustomMonth('')
    setActivePreset(preset)

    if (preset === 'today') {
      setRangeLabel('Hoje')
      fetchData(startOfDay(now), endOfDay(now))
    } else if (preset === 'yesterday') {
      const yesterday = subDays(now, 1)
      setRangeLabel('Ontem')
      fetchData(startOfDay(yesterday), endOfDay(yesterday))
    } else if (preset === 'last7') {
      setRangeLabel('Últimos 7 dias')
      fetchData(startOfDay(subDays(now, 6)), endOfDay(now))
    } else if (preset === 'month') {
      setRangeLabel('Este mês')
      fetchData(startOfMonth(now), endOfMonth(now))
    }
  }

  const applyCustomDay = (value: string) => {
    setCustomDay(value)
    setCustomMonth('')
    setActivePreset(null)
    if (!value) return
    const start = parseLocalDate(value)
    setRangeLabel(format(start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
    fetchData(start, endOfDay(start))
  }

  const applyCustomMonth = (value: string) => {
    setCustomMonth(value)
    setCustomDay('')
    setActivePreset(null)
    if (!value) return
    const [year, month] = value.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    setRangeLabel(format(start, "MMMM 'de' yyyy", { locale: ptBR }))
    fetchData(start, endOfMonth(start))
  }

  const validSales = useMemo(() => sales.filter((s) => s.status !== 'cancelada'), [sales])
  const validBookings = useMemo(() => bookings.filter((b) => b.status !== 'cancelada'), [bookings])

  const productsTotal = validSales.reduce((sum, s) => sum + s.total_amount, 0)
  const courtsTotal = validBookings.reduce((sum, b) => sum + b.total_amount, 0)
  const grandTotal = productsTotal + courtsTotal

  const byPaymentMethod = useMemo(() => {
    const map = new Map<string, number>()
    for (const sale of validSales) {
      map.set(sale.payment_method, (map.get(sale.payment_method) ?? 0) + sale.total_amount)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [validSales])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="mt-1 text-muted-foreground">Acompanhe o faturamento de produtos e quadras por período.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([preset, label]) => (
              <Button
                key={preset}
                type="button"
                variant={activePreset === preset ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => applyPreset(preset)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t border-border/50 pt-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="customDay">Escolher um dia</Label>
              <Input
                id="customDay"
                type="date"
                className="w-full sm:w-48"
                value={customDay}
                onChange={(e) => applyCustomDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customMonth">Escolher um mês</Label>
              <Input
                id="customMonth"
                type="month"
                className="w-full sm:w-48"
                value={customMonth}
                onChange={(e) => applyCustomMonth(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Faturamento total — {rangeLabel}</p>
              <p className="mt-1 text-2xl font-bold">{isLoading ? '...' : formatCurrency(grandTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Produtos + Quadras</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Produtos (Frente de Caixa)</p>
              <p className="mt-1 text-2xl font-bold">{isLoading ? '...' : formatCurrency(productsTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {validSales.length} venda{validSales.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Quadras</p>
              <p className="mt-1 text-2xl font-bold">{isLoading ? '...' : formatCurrency(courtsTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {validBookings.length} reserva{validBookings.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {byPaymentMethod.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {byPaymentMethod.map(([method, amount]) => (
              <Badge key={method} variant="secondary" className="px-3 py-1.5 text-sm">
                {paymentLabel(method)}: {formatCurrency(amount)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas de produtos — {rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
            ) : sales.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma venda nesse período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Data/Hora</th>
                      <th className="px-6 py-3 font-medium">Pagamento</th>
                      <th className="px-6 py-3 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border/30 last:border-0">
                        <td className="px-6 py-3">{format(new Date(sale.created_at), "dd/MM 'às' HH:mm")}</td>
                        <td className="px-6 py-3">{paymentLabel(sale.payment_method)}</td>
                        <td className="px-6 py-3 text-right font-medium">{formatCurrency(sale.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reservas de quadras — {rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
            ) : bookings.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma reserva nesse período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Data</th>
                      <th className="px-6 py-3 font-medium">Cliente / Quadra</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-border/30 last:border-0">
                        <td className="px-6 py-3">{formatLocalDateShort(booking.booking_date)}</td>
                        <td className="px-6 py-3">
                          <div className="font-medium">{booking.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{booking.courts?.name}</div>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={BOOKING_STATUS_VARIANT[booking.status]}>
                            {BOOKING_STATUS_LABEL[booking.status]}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-right font-medium">{formatCurrency(booking.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
