import RealtimeFx from '@/components/RealtimeFx'
import RealtimeIndices from '@/components/RealtimeIndices'
import StatCard from '@/components/StatCard'
import AdSlot from '@/components/AdSlot'
import { getFx, getGold } from '@/lib/fetchers'

export const revalidate = 600 // 10분 재검증 (ISR)

export default async function Page() {
  // 서버에서 기본 데이터(금 시세 등)만 로드
  const [fx, gold] = await Promise.all([getFx(), getGold()])

  // AI 요약 호출
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const ai = await fetch(`${base}/api/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fx, gold, indices: [] }),
    cache: 'no-store'
  }).then(r => r.json()).catch(() => ({ summary: '요약 생성 실패' }))

  return (
    <main className="px-4 py-6 max-w-6xl mx-auto">
      {/* 환율 (실시간, 전일 대비) */}
      <section className="mb-6">
        <RealtimeFx intervalMs={15000} />
      </section>

      {/* 금 시세 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard
          title="Gold (USD/oz)"
          value={gold?.usdPerOunce == null ? '-' : gold.usdPerOunce.toLocaleString()}
          sub={gold?.date ? `업데이트: ${gold.date}` : undefined}
        />
        <StatCard
          title="Gold (KRW/oz)"
          value={gold?.krwPerOunce == null ? '-' : gold.krwPerOunce.toLocaleString()}
          sub={gold?.date ? `업데이트: ${gold.date}` : undefined}
        />
      </section>

      {/* 주요 지수 (실시간) */}
      <section className="mb-8">
        <RealtimeIndices intervalMs={15000} />
      </section>

      {/* AI 코멘트 + 광고 */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-2">오늘의 AI 코멘트</h2>
          <div className="rounded-2xl p-5 bg-[var(--card)] leading-7 whitespace-pre-wrap">
            {ai?.summary || '요약 생성 실패'}
          </div>
        </div>
        <div>
          <AdSlot />
        </div>
      </section>

      <div className="mt-10">
        <AdSlot />
      </div>
    </main>
  )
}
