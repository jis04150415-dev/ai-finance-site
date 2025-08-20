
# Daily AI 금융 브리핑 (광고형)

- 환율(USD/KRW, USD/JPY, USD/EUR)
- 금 시세(XAU/USD, XAU/KRW)
- 주요 지수(S&P500, 나스닥, 다우, 코스피, 코스닥)
- AI 코멘트(OpenAI 키 없으면 규칙 기반)

## 로컬 실행
```bash
cp .env.example .env
npm install
npm run dev
```

## 배포(Vercel)
- 환경변수: `OPENAI_API_KEY`(선택), `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_SITE_URL`
