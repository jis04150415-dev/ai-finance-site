// components/StatCard.tsx
import React from 'react'

type Props = {
  title: string
  value: string
  sub?: React.ReactNode   // ✅ 문자열이 아닌 엘리먼트까지 받도록
}

export default function StatCard({ title, value, sub }: Props) {
  return (
    <div className="rounded-2xl p-5 bg-[var(--card)]">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-2xl">{value}</div>
      {sub && <div className="text-sm text-[var(--muted)] mt-1">{sub}</div>}
    </div>
  )
}