'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

const profileSchema = z.object({
  businessName: z.string().min(2, 'Informe o nome do negócio'),
  ownerName: z.string().min(2, 'Informe seu nome'),
  phone: z.string().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type PasswordValues = z.infer<typeof passwordSchema>

function ProfileForm({ initialProfile }: { initialProfile: Profile | null }) {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: initialProfile?.business_name ?? '',
      ownerName: initialProfile?.owner_name ?? '',
      phone: initialProfile?.phone ?? '',
    },
  })

  const onSubmit = async (values: ProfileValues) => {
    if (!initialProfile) {
      toast({
        variant: 'destructive',
        title: 'Perfil não encontrado',
        description: 'Recarregue a página e tente novamente.',
      })
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ business_name: values.businessName, owner_name: values.ownerName, phone: values.phone || null })
      .eq('id', initialProfile.id)

    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível salvar', description: error.message })
      return
    }
    toast({ variant: 'success', title: 'Perfil atualizado' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Nome do negócio</Label>
        <Input id="businessName" {...register('businessName')} />
        {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownerName">Seu nome</Label>
        <Input id="ownerName" {...register('ownerName')} />
        {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input id="phone" placeholder="(11) 99999-9999" {...register('phone')} />
      </div>
      <Button type="submit" variant="gradient" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar alterações
      </Button>
    </form>
  )
}

function PasswordForm() {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  const onSubmit = async (values: PasswordValues) => {
    const { error } = await supabase.auth.updateUser({ password: values.password })

    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível atualizar a senha', description: error.message })
      return
    }
    reset()
    toast({ variant: 'success', title: 'Senha atualizada' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" variant="gradient" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Atualizar senha
      </Button>
    </form>
  )
}

export function SettingsClient({ email, initialProfile }: { email: string; initialProfile: Profile | null }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-muted-foreground">Gerencie o perfil do seu negócio e da sua conta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil do negócio</CardTitle>
          <CardDescription>Essas informações aparecem no sistema e em relatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initialProfile={initialProfile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
          <CardDescription>E-mail usado para acessar o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={email} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Altere sua senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
