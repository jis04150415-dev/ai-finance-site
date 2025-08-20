
'use client'
import React from 'react'

type Props = {
  title: string
  value: string | number
  sub?: string
}

export default function StatCard({ title, value, sub }: Props){
  return (
    <div className="rounded-2xl p-5 bg-[var(--card)] shadow-lg">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  )
}
