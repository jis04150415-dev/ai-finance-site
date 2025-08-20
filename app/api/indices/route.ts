// app/api/indices/route.ts
import 'server-only'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

type Quote = {
  symbol: string
  name: string
  price: number | null
  chg: number | null
  chgPct: number | null
}

export async function GET() {
  if (!FINNHUB_API_KEY) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'finnhub_failed',
      hint: 'Check FINNHUB_API_KEY in .env',
    }), { status: 500 })
  }

  // 주요 ETF: S&P500, NASDAQ, 다우존스, 한국(EWY)
  const symbols = ['SPY','QQQ','DIA','EWY']
  const result: Quote[] = []

  try {
    for (const symbol of symbols) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        console.error(`Failed to fetch ${symbol}`, res.status)
        continue
      }
      const data = await res.json()
      result.push({
        symbol,
        name: symbol,
        price: typeof data.c === 'number' ? data.c : null,
        chg: typeof data.d === 'number' ? data.d : null,
        chgPct: typeof data.dp === 'number' ? data.dp : null,
      })
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'no-store, no-cache, max-age=0',
      },
    })
  } catch (e) {
    console.error('Finnhub fetch error:', e)
    return new Response(JSON.stringify({
      ok: false,
      error: 'finnhub_failed',
    }), { status: 500 })
  }
}