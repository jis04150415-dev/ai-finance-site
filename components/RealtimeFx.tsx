'use client'

import { useEffect, useMemo, useState } from 'react'
import StatCard from './StatCard'

type FxRow = {
  name: string            // "USD/KRW" 등
  value: number | null
  chg: number | null
  chgPct: number | null
}
type FxResp = {
  ok: boolean
  date?: string
  result?: Array<{
    name: string
    value: number | null
    chg: number | null
    chgPct: number | null
  }>
  error?: string
}

function useLocale() {
  if (typeof window === 'undefined') return { lang: 'ko', tz: 'Asia/Seoul' }
  const lang = (navigator.language || 'ko').split('-')[0]
  try {
    // @ts-ignore
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return { lang, tz }
  } catch {
    return { lang, tz: 'UTC' }
  }
}

function formatNumber(n: number, lang = 'ko') {
  try {
    return n.toLocaleString(lang)
  } catch {
    return n.toLocaleString()
  }
}

function Arrow({ v }: { v: number }) {
  if (v > 0) return <span className="ml-1">▲</span>
  if (v < 0) return <span className="ml-1">▼</span>
  return null
}

export default function RealtimeFx({ intervalMs = 15000 }: { intervalMs?: number }) {
  const { lang, tz } = useLocale()
  const [data, setData] = useState<FxRow[] | null>(null)
  const [lastAt, setLastAt] = useState<Date | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function fetchFx() {
    try {
      setErr(null)
      const r = await fetch(`/api/fx?ts=${Date.now()}`, { cache: 'no-store' })
      const j: FxResp = await r.json()
      if (!j.ok || !j.result) {
        setErr(j.error || 'fx_failed')
        return
      }
      setData(j.result.map(x => ({
        name: x.name,
        value: x.value,
        chg: x.chg ?? 0,
        chgPct: x.chgPct ?? 0
      })))
      setLastAt(new Date())
    } catch (e) {
      setErr('fx_failed')
    }
  }

  useEffect(() => {
    fetchFx()
    const id = setInterval(fetchFx, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  const updatedText = useMemo(() => {
    if (!lastAt) return ''
    try {
      const fmt = new Intl.DateTimeFormat(lang, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: tz
      })
      return fmt.format(lastAt) + ` (${tz})`
    } catch {
      return lastAt.toISOString()
    }
  }, [lastAt, lang, tz])

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xl font-semibold">환율 (전일 대비)</h2>
        <div className="text-xs text-[var(--muted)]">
          {updatedText ? `업데이트: ${updatedText}` : ''}
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-400 mb-2">환율 불러오기 실패: {err}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(data ?? [1,2,3].map(() => null)).map((row, idx) => {
          if (!row) {
            // 스켈레톤
            return (
              <div key={idx} className="rounded-2xl p-5 bg-[var(--card)] animate-pulse h-24" />
            )
          }
          const up = (row.chg ?? 0) > 0
          const down = (row.chg ?? 0) < 0
          const color = up ? 'text-emerald-400' : (down ? 'text-red-400' : 'text-[var(--muted)]')
          return (
            <StatCard
              key={row.name}
              title={row.name}
              value={row.value == null ? '-' : formatNumber(row.value, lang)}
              sub={
                row.chg != null && row.chgPct != null
                  ? <span className={color}>
                      {row.chg > 0 ? '+' : ''}{row.chg.toFixed(4)}
                      {' '}({row.chgPct > 0 ? '+' : ''}{row.chgPct.toFixed(2)}%)
                      <Arrow v={row.chg} />
                    </span>
                  : undefined
              }
            />
          )
        })}
      </div>
    </section>
  )
}