import 'server-only'

/** ===== 환율: Frankfurter (무·키) ===== */
type FrankfurterResp = {
  amount: number  
  base: string  
  date: string
  rates: Record<string, number>
}

export async function getFx() {
  const url = 'https://api.frankfurter.app/latest?from=USD&to=KRW,JPY,EUR'
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

/** ===== 주가지수: Yahoo ===== */
type IndexItem = {
  symbol: string
  shortName?: string
  regularMarketPrice?: number | null
}

export async function getIndexes(): Promise<IndexItem[]> {
  try {
    // S&P500, NASDAQ-100, KOSPI, KOSDAQ
    const symbols = ['^GSPC','^NDX','^KS11','^KQ11'].join(',')
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`
    const r = await fetch(url, { next: { revalidate: 600 } })
    if (!r.ok) throw new Error(`Index fetch failed: ${r.status}`)
    
    const data = (await r.json()) as {
      quoteResponse: { result: Array<{ symbol: string; shortName?: string; regularMarketPrice?: number }> }
    }
 
    const arr: IndexItem[] = (data.quoteResponse?.result ?? []).map(q => ({
      symbol: q.symbol,
      shortName: q.shortName,
      regularMarketPrice: Number.isFinite(q.regularMarketPrice!) ? q.regularMarketPrice! : null,
    }))
   
    return Array.isArray(arr) ? arr : []
  } catch {
    return [] // 실패 시에도 배열 보장 → page.tsx의 map 안전
  }
}

// page.tsx에서 getIndices 이름을 임포트하므로 별칭 유지
export async function getIndices() {
  return getIndexes()
}

/** ===== 금 시세: Yahoo + 환율 ===== */

// Yahoo Finance 응답 타입
type YahooQuoteResp = {
  quoteResponse: {
    result: Array<{
      symbol: string
      shortName?: string
      regularMarketPrice?: number
    }>
  }
}

// Yahoo에서 특정 심볼의 현재가 가져오기
async function fetchYahooPrice(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
  const r = await fetch(url, { next: { revalidate: 600 } })
  if (!r.ok) throw new Error(`Yahoo fetch failed: ${r.status}`)
  const data = (await r.json()) as YahooQuoteResp
  return data.quoteResponse.result?.[0]?.regularMarketPrice ?? null
}

// ==== getGold (강화판) 시작 ====
// Yahoo Finance 응답 타입
type YahooQuoteResp = {
  quoteResponse: {
    result: Array<{
      symbol: string
      shortName?: string
      regularMarketPrice?: number
    }>
  }
}

// ==== getGold (다중 소스 폴백) ====
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
  headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  next: { revalidate: 600 }, // 10분 캐시
}

async function fetchYahooPrices(symbols: string[]) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`
  const r = await fetch(url, YH_REQ_INIT)
  if (!r.ok) throw new Error(`Yahoo fetch failed: ${r.status}`)
  const data = (await r.json()) as YahooQuoteResp
  return data.quoteResponse?.result ?? []
}

async function fetchGoldFromYahoo(): Promise<number | null> {
  try {
    const quotes = await fetchYahooPrices(['XAUUSD=X', 'GC=F'])
    const first = quotes.find(q => Number.isFinite(q.regularMarketPrice as number))
    return first?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

// Stooq CSV: gold futures (gc.f), USD/oz 근사치
async function fetchGoldFromStooq(): Promise<number | null> {
  try {
    const url = 'https://stooq.com/q/l/?s=gc.f&f=sd2t2ohlcv&h&e=csv'
    const r = await fetch(url, { next: { revalidate: 600 } })
    if (!r.ok) throw new Error(`Stooq fetch failed: ${r.status}`)
    const text = await r.text()
    // CSV 예: "Symbol,Date,Time,Open,High,Low,Close,Volume\nGC.F,2025-08-19,22:58:38,2426.5,2432.7,2418.1,2429.1,0"
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
    // 1) 금(USD/oz)
    let usdPerOunce = await fetchGoldFromYahoo()
    if (!usdPerOunce) {
      usdPerOunce = await fetchGoldFromStooq()
    }
    if (!usdPerOunce) {
      return {
        usdPerOunce: 0,
        krwPerOunce: 0,
        date: new Date().toISOString().slice(0, 10),
      }
    }

    // 2) USD→KRW 환율 (Frankfurter)
    const fxUrl = 'https://api.frankfurter.app/latest?from=USD&to=KRW'
    const fr = await fetch(fxUrl, { next: { revalidate: 600 } })
    if (!fr.ok) throw new Error(`FX fetch failed: ${fr.status}`)
    const fdata = (await fr.json()) as { date: string; rates: Record<string, number> }
    const usdkrw = fdata?.rates?.KRW ?? 0

    return {
      usdPerOunce: Number(usdPerOunce.toFixed(2)),
      krwPerOunce: usdkrw ? Number((usdPerOunce * usdkrw).toFixed(0)) : 0,
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
