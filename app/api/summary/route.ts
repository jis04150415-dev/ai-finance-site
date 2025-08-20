
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const Body = z.object({
  fx: z.object({ usdkrw: z.number().optional(), usdjpy: z.number().optional(), usdeur: z.number().optional() }).optional(),
  gold: z.object({ usdPerOunce: z.number().optional(), krwPerOunce: z.number().optional() }).optional(),
  indices: z.array(z.object({
    symbol: z.string(),
    shortName: z.string().optional(),
    regularMarketPrice: z.number().optional(),
    regularMarketChangePercent: z.number().optional(),
  })).optional()
})

export async function POST(req: NextRequest){
  const json = await req.json().catch(()=>({}))
  const { fx, gold, indices } = Body.parse(json)

  const key = process.env.OPENAI_API_KEY
  if(!key){
    const parts: string[] = []
    if(fx?.usdkrw){ parts.push(`달러/원은 약 ${Math.round(fx.usdkrw)}원으로 움직이고 있어요.`) }
    if(gold?.usdPerOunce){ parts.push(`금은 온스당 약 $${Math.round(gold.usdPerOunce)} 수준.`) }
    if(indices?.length){
      const movers = [...indices].sort((a,b)=>(b.regularMarketChangePercent||0)-(a.regularMarketChangePercent||0))
      const best = movers[0]
      if(best?.shortName && best.regularMarketChangePercent!==undefined){
        parts.push(`${best.shortName}가 상대적으로 강세(${best.regularMarketChangePercent.toFixed(2)}%).`)
      }
    }
    parts.push('거래는 항상 분할과 손절 기준을 정해 리스크를 통제하세요.')
    return NextResponse.json({ summary: parts.join(' ') })
  }

  const { OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: key })

  const content = [
    `너는 초보 투자자에게 하루 브리핑을 주는 한국어 금융 애널리스트다.`,
    `데이터(대충 말하지 말 것):`,
    `FX: USD/KRW=${fx?.usdkrw}, USD/JPY=${fx?.usdjpy}, USD/EUR=${fx?.usdeur}`,
    `Gold(oz): USD=${gold?.usdPerOunce}, KRW=${gold?.krwPerOunce}`,
    `Indices: ${indices?.map(i=>`${i.shortName||i.symbol}:${i.regularMarketPrice}(${i.regularMarketChangePercent}%)`).join(', ')}`,
    `형식: 3문단 이내, 과도한 확신 금지, 투자 자문 아님 고지 포함.`
  ].join('\n')

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role:'user', content }],
    temperature: 0.4,
  })

  const summary = resp.choices?.[0]?.message?.content || '요약 생성 실패'
  return NextResponse.json({ summary })
}
