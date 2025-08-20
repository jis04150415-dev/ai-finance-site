
import './globals.css'
import Script from 'next/script'
import React from 'react'

export const metadata = {
  title: 'Daily AI 금융 브리핑',
  description: '환율 · 금 · 주가지수 · AI 코멘트 — 자동 업데이트',
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID as string | undefined
  return (
    <html lang="ko">
      <head>
        {/* ✅ Google AdSense 계정 연결용 메타 태그 */}
        <meta name="google-adsense-account" content="ca-pub-4138822307041326" />
      </head>
      <body>
        <div className="max-w-6xl mx-auto p-5">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Daily AI 금융 브리핑</h1>
            <div className="text-xs text-[var(--muted)]">광고·제휴 배너가 노출될 수 있어요</div>
          </header>
          {children}
          <footer className="mt-12 text-xs text-[var(--muted)]">
            <div>본 정보는 투자 조언이 아니며, 손실 위험이 있습니다.</div>
            <div className="mt-1">© {new Date().getFullYear()} Willy Finance</div>
          </footer>
        </div>
        {client && (
          <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} crossOrigin="anonymous" strategy="afterInteractive"/>
        )}
      </body>
    </html>
  )
}
