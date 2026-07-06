import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// For timestamptz values (full ISO datetime with timezone) only — e.g.
// `sales.created_at`, `court_bookings.created_at`. Do NOT use these on a
// bare `date` column such as `court_bookings.booking_date`; `new Date(...)`
// parses a plain "yyyy-MM-dd" string as UTC midnight, which shifts the
// displayed day backward in negative-UTC-offset timezones. Use
// `parseLocalDate`/`formatLocalDate` below for those instead.
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Safe for bare "yyyy-MM-dd" date-only columns (e.g. `booking_date`) — builds
// the Date from local y/m/d components instead of parsing the string as UTC.
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// dd/MM formatting for a bare "yyyy-MM-dd" date-only column, without
// constructing a Date at all (avoids the UTC-midnight shift entirely).
export function formatLocalDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  concluida: 'Concluída',
}

export const BOOKING_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  pendente: 'warning',
  confirmada: 'success',
  cancelada: 'destructive',
  concluida: 'default',
}
