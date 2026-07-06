'use client'

import { useRef, useState } from 'react'
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarRange, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn, formatCurrency, parseLocalDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'month'
type Tab = 'quick' | 'custom'

const PRESETS: [Preset, string][] = [
  ['today', 'Hoje'],
  ['yesterday', 'Ontem'],
  ['last7', 'Últimos 7 dias'],
  ['last30', 'Últimos 30 dias'],
  ['month', 'Este mês'],
]

export function RevenueFilterCard({ initialTotal, initialCount }: { initialTotal: number; initialCount: number }) {
  const [total, setTotal] = useState(initialTotal)
  const [count, setCount] = useState(initialCount)
  const [label, setLabel] = useState('Faturamento do mês')
  const [activePreset, setActivePreset] = useState<Preset | null>('month')
  const [tab, setTab] = useState<Tab>('quick')
  const [customDay, setCustomDay] = useState('')
  const [customMonth, setCustomMonth] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const requestIdRef = useRef(0)

  const fetchTotal = async (start: Date, end: Date) => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, status')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    // A newer request has since been fired (e.g. the user clicked another
    // preset before this one resolved) — let that one own the final state.
    if (requestId !== requestIdRef.current) return

    setIsLoading(false)
    if (error) return
    const valid = (data ?? []).filter((s) => s.status !== 'cancelada')
    setTotal(valid.reduce((sum, s) => sum + s.total_amount, 0))
    setCount(valid.length)
  }

  const applyPreset = (preset: Preset) => {
    const now = new Date()
    setCustomDay('')
    setCustomMonth('')
    setActivePreset(preset)

    if (preset === 'today') {
      setLabel('Hoje')
      fetchTotal(startOfDay(now), endOfDay(now))
    } else if (preset === 'yesterday') {
      const yesterday = subDays(now, 1)
      setLabel('Ontem')
      fetchTotal(startOfDay(yesterday), endOfDay(yesterday))
    } else if (preset === 'last7') {
      setLabel('Últimos 7 dias')
      fetchTotal(startOfDay(subDays(now, 6)), endOfDay(now))
    } else if (preset === 'last30') {
      setLabel('Últimos 30 dias')
      fetchTotal(startOfDay(subDays(now, 29)), endOfDay(now))
    } else if (preset === 'month') {
      setLabel('Faturamento do mês')
      fetchTotal(startOfMonth(now), endOfMonth(now))
    }
    setOpen(false)
  }

  const applyDay = (value: string) => {
    setCustomDay(value)
    setCustomMonth('')
    setActivePreset(null)
    if (!value) return
    const start = parseLocalDate(value)
    setLabel(format(start, "dd 'de' MMMM", { locale: ptBR }))
    fetchTotal(start, endOfDay(start))
    setOpen(false)
  }

  const applyMonth = (value: string) => {
    setCustomMonth(value)
    setCustomDay('')
    setActivePreset(null)
    if (!value) return
    const [year, month] = value.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    setLabel(format(start, "MMMM 'de' yyyy", { locale: ptBR }))
    fetchTotal(start, endOfMonth(start))
    setOpen(false)
  }

  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
                  aria-label="Escolher período"
                >
                  <CalendarRange className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80">
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setTab('quick')}
                    className={cn(
                      'rounded-lg py-1.5 text-sm font-medium transition-colors',
                      tab === 'quick' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Rápido
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('custom')}
                    className={cn(
                      'rounded-lg py-1.5 text-sm font-medium transition-colors',
                      tab === 'custom' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Personalizado
                  </button>
                </div>

                {tab === 'quick' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map(([preset, presetLabel]) => (
                      <Button
                        key={preset}
                        type="button"
                        variant={activePreset === preset ? 'gradient' : 'outline'}
                        size="sm"
                        className={cn(preset === 'month' && 'col-span-2')}
                        onClick={() => applyPreset(preset)}
                      >
                        {presetLabel}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="revenueDay">Dia específico</Label>
                      <Input
                        id="revenueDay"
                        type="date"
                        value={customDay}
                        onChange={(e) => applyDay(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="revenueMonth">Mês específico</Label>
                      <Input
                        id="revenueMonth"
                        type="month"
                        value={customMonth}
                        onChange={(e) => applyMonth(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <p className="mt-1 text-2xl font-bold">{isLoading ? '...' : formatCurrency(total)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {count} venda{count === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShoppingBag className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
