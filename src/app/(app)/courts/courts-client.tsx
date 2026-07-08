'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Goal, Pencil, Plus, Trash2, Trophy, Volleyball } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CourtForm, type CourtFormValues } from './court-form'
import type { Database } from '@/lib/supabase/types'

type Court = Database['public']['Tables']['courts']['Row']

const TYPE_LABEL: Record<Court['type'], string> = { futebol: 'Futebol', volei: 'Vôlei' }
const TYPE_ICON: Record<Court['type'], typeof Goal> = { futebol: Goal, volei: Volleyball }

export function CourtsClient({ initialCourts }: { initialCourts: Court[] }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [courts, setCourts] = useState(initialCourts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openNewDialog = () => {
    setEditingCourt(null)
    setDialogOpen(true)
  }

  const openEditDialog = (court: Court) => {
    setEditingCourt(court)
    setDialogOpen(true)
  }

  const handleSubmit = async (values: CourtFormValues) => {
    if (!user) return
    setIsSubmitting(true)

    const payload = {
      name: values.name,
      type: values.type,
      price_per_hour: values.pricePerHour,
      description: values.description || null,
      photo_url: values.photoUrl,
    }

    if (editingCourt) {
      const { data, error } = await supabase
        .from('courts')
        .update(payload)
        .eq('id', editingCourt.id)
        .select()
        .single()

      setIsSubmitting(false)
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Não foi possível salvar', description: error?.message })
        return
      }
      setCourts((prev) => prev.map((c) => (c.id === data.id ? data : c)).sort((a, b) => a.name.localeCompare(b.name)))
      toast({ variant: 'success', title: 'Quadra atualizada' })
    } else {
      const { data, error } = await supabase
        .from('courts')
        .insert({ ...payload, user_id: user.id, is_active: true })
        .select()
        .single()

      setIsSubmitting(false)
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Não foi possível cadastrar', description: error?.message })
        return
      }
      setCourts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      toast({ variant: 'success', title: 'Quadra cadastrada' })
    }

    setDialogOpen(false)
  }

  const handleDelete = async (court: Court) => {
    if (!window.confirm(`Excluir "${court.name}"? Essa ação não pode ser desfeita.`)) return

    const { error } = await supabase.from('courts').delete().eq('id', court.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível excluir', description: error.message })
      return
    }
    setCourts((prev) => prev.filter((c) => c.id !== court.id))
    toast({ title: 'Quadra excluída' })
  }

  const handleToggleActive = async (court: Court) => {
    const { data, error } = await supabase
      .from('courts')
      .update({ is_active: !court.is_active })
      .eq('id', court.id)
      .select()
      .single()

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Não foi possível atualizar', description: error?.message })
      return
    }
    setCourts((prev) => prev.map((c) => (c.id === data.id ? data : c)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quadras</h1>
          <p className="mt-1 text-muted-foreground">Gerencie as quadras de futebol e vôlei.</p>
        </div>
        <Button variant="gradient" onClick={openNewDialog}>
          <Plus className="h-4 w-4" />
          Nova quadra
        </Button>
      </div>

      {courts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma quadra cadastrada ainda.</p>
            <Button variant="gradient" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
              Cadastrar primeira quadra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map((court) => {
            const TypeIcon = TYPE_ICON[court.type]
            return (
              <Card key={court.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    {court.photo_url ? (
                      <Image
                        src={court.photo_url}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <TypeIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(court)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(court)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="mt-3 font-bold">{court.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{TYPE_LABEL[court.type]}</Badge>
                    <button onClick={() => handleToggleActive(court)}>
                      <Badge variant={court.is_active ? 'success' : 'secondary'}>
                        {court.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </button>
                  </div>

                  {court.description && <p className="mt-3 text-sm text-muted-foreground">{court.description}</p>}

                  <p className="mt-3 text-lg font-bold text-primary">
                    {formatCurrency(court.price_per_hour)}
                    <span className="text-xs font-normal text-muted-foreground"> /hora</span>
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourt ? 'Editar quadra' : 'Nova quadra'}</DialogTitle>
            <DialogDescription>
              {editingCourt ? 'Atualize as informações da quadra.' : 'Preencha os dados da nova quadra.'}
            </DialogDescription>
          </DialogHeader>
          <CourtForm
            court={editingCourt}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
