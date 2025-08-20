import StatCard from '@/components/StatCard'
import AdSlot from '@/components/AdSlot'
import { getFx, getGold } from '@/lib/fetchers'
import RealtimeIndices from '@/components/RealtimeIndices'
import RealtimeFx from '@/components/RealtimeFx'

export const revalidate = 600 // 10분 재검증 (ISR)

export default async function Page() {
  // 서버에서 데이터 병렬 수집
  const [fx, gold] = await Promise.all([getFx(), getGold()])
  const indices: any[] = [] // indices are fetched client-side via <RealtimeIndices>

  // 요약 생성 (실패 시 기본 메시지)
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const ai = await fetch(`${base}/api/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fx, gold, indices }),
    cache: 'no-store',
  })
    .then((r) => r.json())
    .catch(() => ({ summary: '요약 생성 실패' }))

  return (
    <main className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* 환율 (실시간, 전일 대비) */}
      <div className="mt-2">
        <RealtimeFx intervalMs={15000} />
      </div>

      {/* 금 시세 */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Gold (USD/oz)"
          value={
            gold?.usdPerOunce == null ? '-' : gold.usdPerOunce.toLocaleString()
          }
          sub={gold?.date ? `업데이트: ${gold.date}` : undefined}
        />
        <StatCard
          title="Gold (KRW/oz)"
          value={
            gold?.krwPerOunce == null ? '-' : gold.krwPerOunce.toLocaleString()
          }
          sub={gold?.date ? `업데이트: ${gold.date}` : undefined}
        />
      </section>

      {/* 주요 지수 (실시간) */}
      <div className="mt-8">
        <RealtimeIndices intervalMs={15000} />
      </div>

      {/* AI 코멘트 + 광고 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-2">오늘의 AI 코멘트</h2>
          <div className="rounded-2xl p-5 bg-[var(--card)] leading-7 whitespace-pre-wrap">
            {ai?.summary ?? '요약 생성 실패'}
          </div>
        </div>
        <div>
          <AdSlot />
        </div>
      </div>

      <div className="mt-10">
        <AdSlot />
      </div>
    </main>
  )
}
