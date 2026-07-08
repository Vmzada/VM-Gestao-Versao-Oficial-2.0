'use client'

import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

function ResetPasswordCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')

  useEffect(() => {
    const code = searchParams.get('code')

    const verify = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        setStatus(error ? 'invalid' : 'ready')
        return
      }
      // Some Supabase email templates use the older hash-based recovery
      // flow instead of a `code` query param — in that case the browser
      // client picks up the session from the URL fragment automatically.
      const { data } = await supabase.auth.getSession()
      setStatus(data.session ? 'ready' : 'invalid')
    }

    verify()
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  const onSubmit = async (values: PasswordValues) => {
    const { error } = await supabase.auth.updateUser({ password: values.password })

    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível atualizar a senha', description: error.message })
      return
    }

    toast({ variant: 'success', title: 'Senha atualizada!' })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: 'linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(199, 89%, 48%) 100%)' }}
          >
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold">VM Gestão</h1>
            <p className="text-sm text-muted-foreground">Financeira</p>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
            <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'checking' && (
              <p className="py-6 text-center text-sm text-muted-foreground">Verificando link...</p>
            )}

            {status === 'invalid' && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Esse link de redefinição é inválido ou expirou. Solicite um novo em{' '}
                <a href="/login" className="font-semibold text-primary hover:underline">
                  Esqueci minha senha
                </a>
                .
              </p>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Atualizar senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordCard />
    </Suspense>
  )
}
