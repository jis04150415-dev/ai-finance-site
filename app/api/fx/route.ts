// app/api/fx/route.ts
import 'server-only'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper to format date as YYYY-MM-DD in UTC
function fmt(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Get the previous business day up to 7 days back (Frankfurter has no weekends)
async function getPrevDateWithData(latestDate: string): Promise<string> {
  let base = new Date(latestDate + 'T00:00:00Z')
  for (let i = 1; i <= 7; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() - i)
    const ds = fmt(d)
    const url = `https://api.frankfurter.app/${ds}?from=USD&to=KRW,JPY,EUR`
    const r = await fetch(url, { cache: 'no-store' })
    if (r.ok) {
      const j = await r.json()
      if (j && j.rates && (j.rates.KRW || j.rates.JPY || j.rates.EUR)) {
        return ds
      }
    }
  }
  return latestDate
}

export async function GET() {
  try {
    // 1) latest
    const latestUrl = 'https://api.frankfurter.app/latest?from=USD&to=KRW,JPY,EUR'
    const res = await fetch(latestUrl, { cache: 'no-store' })
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'fx_latest_failed' }), { status: 500 })
    }
    const latest = await res.json() as {
      date: string
      rates: Record<string, number>
    }

    // 2) previous business day
    const prevDate = await getPrevDateWithData(latest.date)
    const prevUrl = `https://api.frankfurter.app/${prevDate}?from=USD&to=KRW,JPY,EUR`
    const resPrev = await fetch(prevUrl, { cache: 'no-store' })
    const prev = resPrev.ok ? await resPrev.json() as { rates: Record<string, number> } : { rates: {} as Record<string, number> }

    type Row = { pair: string; name: string; value: number | null; chg: number | null; chgPct: number | null }
    const out: Row[] = []
    const map: Array<[keyof typeof latest.rates, string]> = [['KRW','USD/KRW'], ['JPY','USD/JPY'], ['EUR','USD/EUR']]

    for (const [k, name] of map) {
      const cur = latest.rates?.[k]
      const prevVal = prev.rates?.[k]
      let chg: number | null = null
      let chgPct: number | null = null
      if (typeof cur === 'number' && typeof prevVal === 'number') {
        chg = cur - prevVal
        chgPct = prevVal !== 0 ? (chg / prevVal) * 100 : null
      }
      out.push({
        pair: String(k),
        name,
        value: typeof cur === 'number' ? cur : null,
        chg,
        chgPct
      })
    }

    return new Response(JSON.stringify({ ok: true, date: latest.date, result: out }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store'
      },
    })
  } catch (e) {
    console.error('fx route error', e)
    return new Response(JSON.stringify({ ok: false, error: 'fx_failed' }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store'
      }
    })
  }
}
