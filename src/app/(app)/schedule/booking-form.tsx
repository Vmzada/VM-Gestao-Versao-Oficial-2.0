'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

type Booking = Database['public']['Tables']['court_bookings']['Row']
type CourtOption = { id: string; name: string; type: string; price_per_hour: number }

const bookingSchema = z
  .object({
    courtId: z.string().min(1, 'Selecione a quadra'),
    customerName: z.string().min(2, 'Informe o nome do cliente'),
    customerPhone: z.string().optional(),
    bookingDate: z.string().min(1, 'Selecione a data'),
    startTime: z.string().min(1, 'Informe o horário de início'),
    endTime: z.string().min(1, 'Informe o horário de término'),
    notes: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'O horário de término deve ser depois do início',
    path: ['endTime'],
  })

export type BookingFormValues = z.infer<typeof bookingSchema>

function calculateTotal(courts: CourtOption[], courtId: string, startTime: string, endTime: string) {
  const court = courts.find((c) => c.id === courtId)
  if (!court || !startTime || !endTime || endTime <= startTime) return 0
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const hours = (endH * 60 + endM - (startH * 60 + startM)) / 60
  return Math.round(court.price_per_hour * hours * 100) / 100
}

export function BookingForm({
  booking,
  courts,
  defaultDate,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  booking?: Booking | null
  courts: CourtOption[]
  defaultDate: string
  onSubmit: (values: BookingFormValues, total: number) => void | Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: booking
      ? {
          courtId: booking.court_id,
          customerName: booking.customer_name,
          customerPhone: booking.customer_phone ?? '',
          bookingDate: booking.booking_date,
          startTime: booking.start_time.slice(0, 5),
          endTime: booking.end_time.slice(0, 5),
          notes: booking.notes ?? '',
        }
      : { courtId: courts[0]?.id ?? '', bookingDate: defaultDate, startTime: '', endTime: '' },
  })

  const courtId = watch('courtId')
  const startTime = watch('startTime')
  const endTime = watch('endTime')
  const total = calculateTotal(courts, courtId, startTime, endTime)

  const submit = (values: BookingFormValues) => onSubmit(values, total)

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="courtId">Quadra</Label>
        <Select value={courtId} onValueChange={(value) => setValue('courtId', value, { shouldValidate: true })}>
          <SelectTrigger id="courtId">
            <SelectValue placeholder="Selecione a quadra" />
          </SelectTrigger>
          <SelectContent>
            {courts.map((court) => (
              <SelectItem key={court.id} value={court.id}>
                {court.name} — {formatCurrency(court.price_per_hour)}/h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.courtId && <p className="text-xs text-destructive">{errors.courtId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Cliente</Label>
          <Input id="customerName" placeholder="Nome do cliente" {...register('customerName')} />
          {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Telefone (opcional)</Label>
          <Input id="customerPhone" placeholder="(11) 99999-9999" {...register('customerPhone')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bookingDate">Data</Label>
          <Input id="bookingDate" type="date" {...register('bookingDate')} />
          {errors.bookingDate && <p className="text-xs text-destructive">{errors.bookingDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Início</Label>
          <Input id="startTime" type="time" {...register('startTime')} />
          {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Término</Label>
          <Input id="endTime" type="time" {...register('endTime')} />
          {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea id="notes" placeholder="Detalhes da reserva..." {...register('notes')} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
        <span className="text-sm text-muted-foreground">Valor total</span>
        <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="gradient" disabled={isSubmitting || courts.length === 0}>
          {booking ? 'Salvar alterações' : 'Criar reserva'}
        </Button>
      </div>
    </form>
  )
}
