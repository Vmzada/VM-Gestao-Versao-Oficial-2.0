'use client'

import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Wallet, Loader2, Eye, EyeOff } from 'lucide-react'
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
  'Email not confirmed': 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada (e o spam).',
}

function translateAuthError(message: string) {
  return AUTH_ERROR_MESSAGES[message] ?? message
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.6 5.6 0 0 1-2.4 3.65v3h3.86c2.26-2.09 3.56-5.17 3.56-8.89Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.07 7.93-2.89l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.59H1.28a12 12 0 0 0 0 10.82l3.99-3.11Z" fill="#FBBC05" />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.59l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function PasswordInput({
  id,
  registerProps,
  placeholder = '••••••••',
}: {
  id: string
  registerProps: UseFormRegisterReturn
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input id={id} type={visible ? 'text' : 'password'} placeholder={placeholder} className="pr-10" {...registerProps} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}

function GoogleButton() {
  return (
    <>
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={signInWithGoogle}>
        <GoogleIcon />
        Continuar com Google
      </Button>
    </>
  )
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
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="voce@email.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput id="password" registerProps={register('password')} />
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
      <GoogleButton />
    </>
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
    <>
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
          <PasswordInput id="signupPassword" registerProps={register('password')} />
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
      <GoogleButton />
    </>
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
