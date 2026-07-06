'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Wallet, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

const signupSchema = z.object({
  businessName: z.string().min(2, 'Informe o nome do seu negócio'),
  ownerName: z.string().min(2, 'Informe seu nome'),
  phone: z.string().optional(),
  email: z.email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha inválidos.',
  'User already registered': 'Já existe uma conta com esse e-mail.',
}

function translateAuthError(message: string) {
  return AUTH_ERROR_MESSAGES[message] ?? message
}

function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    const { error } = await supabase.auth.signInWithPassword(values)

    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível entrar', description: translateAuthError(error.message) })
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" placeholder="voce@email.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Entrar
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <button type="button" onClick={onSwitchToSignup} className="font-semibold text-primary hover:underline">
          Criar conta
        </button>
      </p>
    </form>
  )
}

function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async ({ businessName, ownerName, phone, email, password }: SignupValues) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { business_name: businessName, owner_name: ownerName, phone: phone || null } },
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Não foi possível criar a conta', description: translateAuthError(error.message) })
      return
    }

    if (!data.user) {
      toast({ variant: 'destructive', title: 'Não foi possível criar a conta', description: 'Tente novamente em instantes.' })
      return
    }

    if (!data.session) {
      // Email confirmation is required — there's no session yet, so RLS
      // would reject a profile insert now. The (app) layout creates the
      // profile row from the signup metadata on first authenticated visit.
      toast({ title: 'Confirme seu e-mail', description: 'Enviamos um link de confirmação para o seu e-mail.' })
      onSwitchToLogin()
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: data.user.id,
      business_name: businessName,
      owner_name: ownerName,
      phone: phone || null,
    })

    if (profileError) {
      toast({ variant: 'destructive', title: 'Conta criada, mas houve um erro', description: profileError.message })
      return
    }

    toast({ variant: 'success', title: 'Conta criada com sucesso!' })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Nome do negócio</Label>
        <Input id="businessName" placeholder="Lancheria do Zé" {...register('businessName')} />
        {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownerName">Seu nome</Label>
        <Input id="ownerName" placeholder="José da Silva" {...register('ownerName')} />
        {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input id="phone" placeholder="(11) 99999-9999" {...register('phone')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signupEmail">E-mail</Label>
        <Input id="signupEmail" type="email" placeholder="voce@email.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signupPassword">Senha</Label>
        <Input id="signupPassword" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Criar conta
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-primary hover:underline">
          Entrar
        </button>
      </p>
    </form>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

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

        <Card className={cn('shadow-xl')}>
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'Entrar' : 'Criar conta'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Acesse sua conta para gerenciar seu negócio.'
                : 'Comece a gerenciar seu negócio em poucos minutos.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'login' ? (
              <LoginForm onSwitchToSignup={() => setMode('signup')} />
            ) : (
              <SignupForm onSwitchToLogin={() => setMode('login')} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
