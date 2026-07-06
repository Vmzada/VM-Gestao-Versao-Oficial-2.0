'use client'

import { useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_VARIANT, formatCurrency, parseLocalDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookingForm, type BookingFormValues } from './booking-form'
import type { Database } from '@/lib/supabase/types'

type Booking = Database['public']['Tables']['court_bookings']['Row'] & {
  courts: { name: string; type: string } | null
}
type CourtOption = { id: string; name: string; type: string; price_per_hour: number }
type BookingStatus = Booking['status']

function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA
}

export function ScheduleClient({
  initialDate,
  initialBookings,
  courts,
}: {
  initialDate: string
  initialBookings: Booking[]
  courts: CourtOption[]
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [date, setDate] = useState(initialDate)
  const [bookings, setBookings] = useState(initialBookings)
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const requestIdRef = useRef(0)

  const fetchBookings = async (dateStr: string) => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    const { data, error } = await supabase
      .from('court_bookings')
      .select('*, courts(name, type)')
      .eq('booking_date', dateStr)
      .order('start_time', { ascending: true })

    // Ignore this response if the user has since navigated to another day.
    if (requestId !== requestIdRef.current) return

    setIsLoading(false)
    if (!error) setBookings(data ?? [])
  }

  const goToDate = (dateStr: string) => {
    setDate(dateStr)
    fetchBookings(dateStr)
  }

  const goToOffset = (days: number) => {
    const newDate = format(addDays(parseLocalDate(date), days), 'yyyy-MM-dd')
    goToDate(newDate)
  }

  const goToToday = () => goToDate(format(new Date(), 'yyyy-MM-dd'))

  const openNewDialog = () => {
    setEditingBooking(null)
    setDialogOpen(true)
  }

  const openEditDialog = (booking: Booking) => {
    setEditingBooking(booking)
    setDialogOpen(true)
  }

  const handleSubmit = async (values: BookingFormValues, total: number) => {
    if (!user) return

    // Check against a fresh read for the *chosen* court/date rather than the
    // locally-cached `bookings` list, which only holds bookings for whatever
    // day the calendar happens to be showing — the date field inside this
    // form can be changed to a different day than the one currently viewed.
    const { data: existingBookings, error: conflictCheckError } = await supabase
      .from('court_bookings')
      .select('id, start_time, end_time')
      .eq('court_id', values.courtId)
      .eq('booking_date', values.bookingDate)
      .neq('status', 'cancelada')

    if (conflictCheckError) {
      toast({ variant: 'destructive', title: 'Não foi possível verificar conflitos', description: conflictCheckError.message })
      return
    }

    const conflict = (existingBookings ?? []).some((b) => {
      if (editingBooking && b.id === editingBooking.id) return false
      return timesOverlap(values.startTime, values.endTime, b.start_time.slice(0, 5), b.end_time.slice(0, 5))
    })

    if (conflict) {
      toast({ variant: 'destructive', title: 'Conflito de horário', description: 'Já existe uma reserva para essa quadra nesse horário.' })
      return
    }

    setIsSubmitting(true)
    const payload = {
      court_id: values.courtId,
      customer_name: values.customerName,
      customer_phone: values.customerPhone || null,
      booking_date: values.bookingDate,
      start_time: values.startTime,
      end_time: values.endTime,
      total_amount: total,
      notes: values.notes || null,
    }

    if (editingBooking) {
      const { error } = await supabase.from('court_bookings').update(payload).eq('id', editingBooking.id)
      setIsSubmitting(false)
      if (error) {
        toast({ variant: 'destructive', title: 'Não foi possível salvar', description: error.message })
        return
      }
      toast({ variant: 'success', title: 'Reserva atualizada' })
    } else {
      const { error } = await supabase
        .from('court_bookings')
        .insert({ ...payload, user_id: user.id, status: 'pendente' })
      setIsSubmitting(false)
      if (error) {
        toast({ variant: 'destructive', title: 'Não foi possível criar a reserva', description: error.message })
        return
      }
      toast({ variant: 'success', title: 'Reserva criada' })
    }

    setDialogOpen(false)
    if (values.bookingDate === date) {
      fetchBookings(date)
    } else {
      goToDate(values.bookingDate)
    }
  }

  const handleStatusChange = async (booking: Booking, status: BookingStatus) => {
    const { error } = await supabase.from('court_bookings').update({ status }).eq('id', booking.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível atualizar', description: error.message })
      return
    }
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status } : b)))
  }

  const handleDelete = async (booking: Booking) => {
    if (!window.confirm(`Excluir a reserva de ${booking.customer_name}? Essa ação não pode ser desfeita.`)) return

    const { error } = await supabase.from('court_bookings').delete().eq('id', booking.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível excluir', description: error.message })
      return
    }
    setBookings((prev) => prev.filter((b) => b.id !== booking.id))
    toast({ title: 'Reserva excluída' })
  }

  const displayDate = format(parseLocalDate(date), "EEEE, dd 'de' MMMM", { locale: ptBR })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="mt-1 text-muted-foreground">Gerencie as reservas das quadras.</p>
        </div>
        <Button variant="gradient" onClick={openNewDialog} disabled={courts.length === 0}>
          <Plus className="h-4 w-4" />
          Nova reserva
        </Button>
      </div>

      {courts.length === 0 && (
        <Card className="border-warning/40 bg-yellow-500/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Cadastre ao menos uma quadra ativa em <strong>Quadras</strong> antes de criar reservas.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => goToOffset(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input type="date" value={date} onChange={(e) => goToDate(e.target.value)} className="w-44" />
            <Button variant="outline" size="icon-sm" onClick={() => goToOffset(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>
          <p className="text-sm font-medium capitalize text-muted-foreground">{displayDate}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma reserva para esse dia.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {bookings.map((booking) => (
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-semibold tabular-nums">
                      {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}
                    </div>
                    <div>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.courts?.name}
                        {booking.customer_phone && ` · ${booking.customer_phone}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(booking.total_amount)}</span>
                    <Select value={booking.status} onValueChange={(value) => handleStatusChange(booking, value as BookingStatus)}>
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue>
                          <Badge variant={BOOKING_STATUS_VARIANT[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {BOOKING_STATUS_LABEL[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(booking)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(booking)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBooking ? 'Editar reserva' : 'Nova reserva'}</DialogTitle>
            <DialogDescription>
              {editingBooking ? 'Atualize as informações da reserva.' : 'Preencha os dados da nova reserva.'}
            </DialogDescription>
          </DialogHeader>
          <BookingForm
            booking={editingBooking}
            courts={courts}
            defaultDate={date}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
