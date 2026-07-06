'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Database } from '@/lib/supabase/types'

type Court = Database['public']['Tables']['courts']['Row']

const courtSchema = z.object({
  name: z.string().min(2, 'Informe o nome da quadra'),
  type: z.enum(['futebol', 'volei']),
  pricePerHour: z.coerce.number().positive('Informe um preço válido'),
  description: z.string().optional(),
})

export type CourtFormValues = z.infer<typeof courtSchema>

export function CourtForm({
  court,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  court?: Court | null
  onSubmit: (values: CourtFormValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof courtSchema>, unknown, CourtFormValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: court
      ? {
          name: court.name,
          type: court.type,
          pricePerHour: court.price_per_hour,
          description: court.description ?? '',
        }
      : { type: 'futebol' },
  })

  const type = watch('type')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da quadra</Label>
        <Input id="name" placeholder="Quadra Society" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select value={type} onValueChange={(value) => setValue('type', value as 'futebol' | 'volei', { shouldValidate: true })}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="futebol">Futebol</SelectItem>
              <SelectItem value="volei">Vôlei</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricePerHour">Preço por hora</Label>
          <Input id="pricePerHour" type="number" step="0.01" min="0" {...register('pricePerHour')} />
          {errors.pricePerHour && <p className="text-xs text-destructive">{errors.pricePerHour.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea id="description" placeholder="Detalhes sobre a quadra..." {...register('description')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="gradient" disabled={isSubmitting}>
          {court ? 'Salvar alterações' : 'Cadastrar quadra'}
        </Button>
      </div>
    </form>
  )
}
