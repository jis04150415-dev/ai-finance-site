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

// 간단 로케일/타임존 감지
function useLocale() {
  if (typeof window === 'undefined') return { lang: 'ko', tz: 'Asia/Seoul' as string }
  const lang = (navigator.language || 'ko').split('-')[0]
  let tz: string = 'UTC'
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch { /* noop */ }
  return { lang, tz }
}

function formatNumber(n: number, lang = 'ko') {
  try {
    return n.toLocaleString(lang)
  } catch {
    return n.toLocaleString()
  }
}

const LABELS = {
  ko: { title: '환율 (전일 대비)', updated: '업데이트' },
  ja: { title: '為替（前日比）', updated: '更新' },
  en: { title: 'FX Rates (DoD Change)', updated: 'Updated' },
} as const

type LangKey = keyof typeof LABELS
const toKey = (lang: string): LangKey => (lang === 'ko' ? 'ko' : lang === 'ja' ? 'ja' : 'en')

export default function RealtimeFx({ intervalMs = 15000 }: { intervalMs?: number }) {
  const { lang, tz } = useLocale()
  const langKey = toKey(lang)
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
    } catch {
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

  const rows: (FxRow | null)[] = data ?? [null, null, null];

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xl font-semibold">{LABELS[langKey].title}</h2>
        <div className="text-xs text-[var(--muted)]">
          {updatedText ? `${LABELS[langKey].updated}: ${updatedText}` : ''}
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-400 mb-2">환율 불러오기 실패: {err}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map((row, idx) => {
          if (!row) {
            // 스켈레톤
            return (
              <div key={idx} className="rounded-2xl p-5 bg-[var(--card)] animate-pulse h-24" />
            )
          }
          const up = (row.chg ?? 0) > 0
          const down = (row.chg ?? 0) < 0
          const color = up ? 'text-emerald-500' : (down ? 'text-red-500' : 'text-[var(--muted)]')
          const arrow = up ? '▲ ' : (down ? '▼ ' : '• ')
          const sign = up ? '+' : ''

          return (
            <StatCard
              key={row.name}
              title={row.name}
              value={row.value == null ? '-' : formatNumber(row.value, lang)}
              sub={
                row.chg != null && row.chgPct != null ? (
                  <span className={color}>
                    {arrow}{sign}{row.chg.toFixed(4)} ({row.chgPct > 0 ? '+' : ''}{row.chgPct.toFixed(2)}%)
                  </span>
                ) : undefined
              }
            />
          )
        })}
      </div>
    </section>
  )
}