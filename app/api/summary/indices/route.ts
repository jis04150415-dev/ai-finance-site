// app/api/indices/route.ts
import 'server-only'

export const runtime = 'edge' // 빠른 응답(선택)

type Quote = {
  symbol: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
}

export async function GET() {
  const symbols = ['^GSPC','^NDX','^DJI','^KS11','^KQ11'].join(',')
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      // Pretend a real browser request to avoid 401 from Yahoo
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Origin': 'https://finance.yahoo.com',
      'Referer': 'https://finance.yahoo.com/'
    }
  })

  if (!res.ok) {
    return new Response(JSON.stringify({ ok:false, error:`${res.status}` }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const data = await res.json() as { quoteResponse: { result: Quote[] } }
  const result = (data.quoteResponse?.result ?? []).map(q => ({
    symbol: q.symbol,
    name: q.shortName ?? q.symbol,
    price: Number.isFinite(q.regularMarketPrice!) ? q.regularMarketPrice! : null,
    chg: Number.isFinite(q.regularMarketChange!) ? q.regularMarketChange! : null,
    chgPct: Number.isFinite(q.regularMarketChangePercent!) ? q.regularMarketChangePercent! : null,
  }))

  return new Response(JSON.stringify({ ok:true, result }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'Cache-Control': 'no-store, no-cache, max-age=0',
    },
  })
}