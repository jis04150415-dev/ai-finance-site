import 'server-only'

/* ========= 공용 타입/헬퍼 (중복 금지, 한 번만 선언) ========= */
type FrankfurterResp = {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

type YahooQuoteResp = {
  quoteResponse: {
    result: Array<{
      symbol: string
      shortName?: string
      regularMarketPrice?: number
    }>
  }
}

const YH_REQ_INIT: RequestInit = {
  headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  next: { revalidate: 600 },
}

async function fetchYahooPrices(symbols: string[]) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    symbols.join(',')
  )}`
  const r = await fetch(url, YH_REQ_INIT)
  if (!r.ok) throw new Error(`Yahoo fetch failed: ${r.status}`)
  const data = (await r.json()) as YahooQuoteResp
  return data.quoteResponse?.result ?? []
}

/* ========= 환율 ========= */
export async function getFx() {
  const url =
    'https://api.frankfurter.app/latest?from=USD&to=KRW,JPY,EUR'
  const r = await fetch(url, { next: { revalidate: 600 } })
  if (!r.ok) throw new Error(`FX fetch failed: ${r.status}`)
  const data = (await r.json()) as FrankfurterResp
  return {
    date: data.date,
    usdkrw: data.rates?.KRW ?? 0,
    usdjpy: data.rates?.JPY ?? 0,
    usdeur: data.rates?.EUR ?? 0,
  }
}

/* ========= 금 시세 (다중 소스 폴백) ========= */
async function fetchGoldFromYahoo(): Promise<number | null> {
  try {
    const quotes = await fetchYahooPrices(['XAUUSD=X', 'GC=F'])
    const first = quotes.find(q =>
      Number.isFinite(q.regularMarketPrice as number)
    )
    return first?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

// Stooq CSV 선물 종가 폴백 (USD/oz 근사)
async function fetchGoldFromStooq(): Promise<number | null> {
  try {
    const url =
      'https://stooq.com/q/l/?s=gc.f&f=sd2t2ohlcv&h&e=csv'
    const r = await fetch(url, { next: { revalidate: 600 } })
    if (!r.ok) throw new Error(`Stooq fetch failed: ${r.status}`)
    const text = await r.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return null
    const cols = lines[1].split(',')
    const close = parseFloat(cols[6])
    return Number.isFinite(close) ? close : null
  } catch {
    return null
  }
}

export async function getGold() {
  try {
    // 1) 금 USD/oz
    let usdPerOunce = await fetchGoldFromYahoo()
    if (!usdPerOunce) usdPerOunce = await fetchGoldFromStooq()
    if (!usdPerOunce) {
      return {
        usdPerOunce: 0,
        krwPerOunce: 0,
        date: new Date().toISOString().slice(0, 10),
      }
    }

    // 2) USD→KRW
    const fxUrl =
      'https://api.frankfurter.app/latest?from=USD&to=KRW'
    const fr = await fetch(fxUrl, { next: { revalidate: 600 } })
    if (!fr.ok) throw new Error(`FX fetch failed: ${fr.status}`)
    const fdata = (await fr.json()) as {
      date: string
      rates: Record<string, number>
    }
    const usdkrw = fdata?.rates?.KRW ?? 0

    return {
      usdPerOunce: Number(usdPerOunce.toFixed(2)),
      krwPerOunce: usdkrw
        ? Number((usdPerOunce * usdkrw).toFixed(0))
        : 0,
      date: fdata?.date || new Date().toISOString().slice(0, 10),
    }
  } catch {
    return {
      usdPerOunce: 0,
      krwPerOunce: 0,
      date: new Date().toISOString().slice(0, 10),
    }
  }
}

/* ========= 주요 지수 ========= */
type IndexItem = {
  symbol: string
  shortName?: string
  regularMarketPrice?: number | null
}

export async function getIndexes(): Promise<IndexItem[]> {
  try {
    const symbols = ['^GSPC', '^NDX', '^KS11', '^KQ11'].join(',')
    const quotes = await fetchYahooPrices([symbols]) // 한 번에 질의
    const arr: IndexItem[] = (quotes ?? []).map(q => ({
      symbol: q.symbol,
      shortName: q.shortName,
      regularMarketPrice: Number.isFinite(q.regularMarketPrice!)
        ? q.regularMarketPrice!
        : null,
    }))
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// page.tsx에서 이 이름으로 임포트하므로 유지
export async function getIndices() {
  return getIndexes()
}
