'use client'

import { useEffect, useState } from 'react'

type Row = {
  symbol: string
  name: string
  price: number | null
  chg: number | null
  chgPct: number | null
}

export default function RealtimeIndices({ intervalMs = 15000 }: { intervalMs?: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [ts, setTs] = useState<string>('')

  async function load() {
    try {
      setErr(null)
      const r = await fetch(`/api/indices?t=${Date.now()}`, { cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'fetch failed')
      setRows(j.result)
      setTs(new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))
    } catch (e:any) {
      setErr(e.message || 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between mb-2">
        <h2 className="text-xl font-semibold">주요 지수 (실시간·자동 갱신)</h2>
        <div className="text-xs text-[var(--muted)]">
          {loading ? '불러오는 중…' : `업데이트: ${ts}`}
          {err && <span className="ml-2 text-red-600">({err})</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(rows ?? []).map((r) => {
          const up = (r.chg ?? 0) > 0
          const sign = up ? '+' : ''
          return (
            <div key={r.symbol} className="rounded-2xl p-4 bg-[var(--card)] shadow">
              <div className="text-sm text-[var(--muted)]">{r.symbol}</div>
              <div className="text-lg font-semibold">{r.name}</div>
              <div className="mt-2 text-2xl">
                {r.price == null ? '-' : r.price.toLocaleString()}
              </div>
              <div className={`mt-1 text-sm ${up ? 'text-green-600' : 'text-red-600'}`}>
                {r.chg == null
                  ? '-'
                  : `${sign}${r.chg.toLocaleString()} (${sign}${(r.chgPct ?? 0).toFixed(2)}%)`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}