'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'

type RevenuePoint = {
  label: string
  total: number
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(240, 5.9%, 90%)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={56}
          tickFormatter={(value: number) => formatCurrency(value).replace('R$', 'R$ ')}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']}
          contentStyle={{ borderRadius: 12, border: '1px solid hsl(240, 5.9%, 90%)' }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
