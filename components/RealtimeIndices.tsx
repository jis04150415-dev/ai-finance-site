'use client'

import { useEffect, useState } from 'react'

type Row = {
  symbol: string
  name: string
  price: number | null
  chg: number | null
  chgPct: number | null
}

// ==== i18n helpers ====
// Supported locales (language-only keys). Fallback to 'en'.
type LocaleKey = 'ko' | 'en' | 'ja' | 'zh' | 'fr' | 'de' | 'es' | 'pt' | 'vi' | 'id' | 'th' | 'ru' | 'hi' | 'ar'
const detectLocale = (): LocaleKey => {
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase()
    if (lang.startsWith('ko')) return 'ko'
    if (lang.startsWith('ja')) return 'ja'
    if (lang.startsWith('zh')) return 'zh'
    if (lang.startsWith('fr')) return 'fr'
    if (lang.startsWith('de')) return 'de'
    if (lang.startsWith('es')) return 'es'
    if (lang.startsWith('pt')) return 'pt'
    if (lang.startsWith('vi')) return 'vi'
    if (lang.startsWith('id')) return 'id'
    if (lang.startsWith('th')) return 'th'
    if (lang.startsWith('ru')) return 'ru'
    if (lang.startsWith('hi')) return 'hi'
    if (lang.startsWith('ar')) return 'ar'
  }
  return 'en'
}

const MESSAGES: Record<LocaleKey, { title: string; updated: string; loading: string }> = {
  ko: { title: '주요 지수 (실시간·자동 갱신)', updated: '업데이트', loading: '불러오는 중…' },
  en: { title: 'Major Indices (Live · Auto Refresh)', updated: 'Updated', loading: 'Loading…' },
  ja: { title: '主要指数（リアルタイム・自動更新）', updated: '更新', loading: '読み込み中…' },
  zh: { title: '主要指数（实时·自动刷新）', updated: '更新', loading: '加载中…' },
  fr: { title: 'Indices majeurs (Temps réel · Auto)', updated: 'Mis à jour', loading: 'Chargement…' },
  de: { title: 'Wichtige Indizes (Live · Auto)', updated: 'Aktualisiert', loading: 'Laden…' },
  es: { title: 'Índices principales (En vivo · Auto)', updated: 'Actualizado', loading: 'Cargando…' },
  pt: { title: 'Principais índices (Ao vivo · Auto)', updated: 'Atualizado', loading: 'Carregando…' },
  vi: { title: 'Chỉ số chính (Trực tiếp · Tự động)', updated: 'Cập nhật', loading: 'Đang tải…' },
  id: { title: 'Indeks utama (Langsung · Otomatis)', updated: 'Diperbarui', loading: 'Memuat…' },
  th: { title: 'ดัชนีหลัก (เรียลไทม์ · อัตโนมัติ)', updated: 'อัปเดต', loading: 'กำลังโหลด…' },
  ru: { title: 'Ключевые индексы (Онлайн · Авто)', updated: 'Обновлено', loading: 'Загрузка…' },
  hi: { title: 'मुख्य सूचकांक (लाइव · ऑटो)', updated: 'अपडेट', loading: 'लोड हो रहा है…' },
  ar: { title: 'المؤشرات الرئيسية (مباشر · تلقائي)', updated: 'تم التحديث', loading: 'جارٍ التحميل…' },
}

export default function RealtimeIndices({ intervalMs = 15000 }: { intervalMs?: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [ts, setTs] = useState<string>('')

  const [locale, setLocale] = useState<LocaleKey>('en')
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined)

  useEffect(() => {
    setLocale(detectLocale())
    try {
      // Use the visitor’s actual time zone from the browser
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimeZone(tz)
    } catch {
      setTimeZone(undefined)
    }
  }, [])

  async function load() {
    try {
      setErr(null)
      const r = await fetch(`/api/indices?t=${Date.now()}`, { cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'fetch failed')
      setRows(j.result)
      // Show local time with detected time zone if available
      setTs(
        new Date().toLocaleString(locale, {
          hour12: false,
          timeZone: timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        } as Intl.DateTimeFormatOptions)
      )
    } catch (e: any) {
      setErr(e.message || 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, intervalMs)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, locale, timeZone])

  const t = MESSAGES[locale]

  const Skeleton = () => (
    <div className="rounded-2xl p-4 bg-[var(--card)] shadow animate-pulse">
      <div className="h-3 w-16 bg-gray-300/40 rounded mb-2" />
      <div className="h-5 w-28 bg-gray-300/40 rounded mb-3" />
      <div className="h-7 w-24 bg-gray-300/40 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-300/40 rounded" />
    </div>
  )

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between mb-2">
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <div className="text-xs text-[var(--muted)]">
          {loading ? t.loading : `${t.updated}: ${ts}${timeZone ? ` (${timeZone})` : ''}`}
          {err && <span className="ml-2 text-red-600">({err})</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading && rows.length === 0 && (
          <>
            <Skeleton /><Skeleton /><Skeleton /><Skeleton />
          </>
        )}

        {(rows ?? []).map((r) => {
          const up = (r.chg ?? 0) > 0
          const down = (r.chg ?? 0) < 0
          const sign = up ? '+' : ''
          const arrow = up ? '▲' : down ? '▼' : '•'
          const changeColor = up ? 'text-green-600' : down ? 'text-red-600' : 'text-[var(--muted)]'
          const mainTitle = r.name || r.symbol
          const showSymbolLine = r.name && r.name !== r.symbol

          return (
            <div
              key={r.symbol}
              className="rounded-2xl p-4 bg-[var(--card)] shadow transition-transform hover:-translate-y-0.5"
            >
              <div className="text-lg font-semibold">{mainTitle}</div>
              {showSymbolLine && (
                <div className="text-xs text-[var(--muted)] mt-0.5">{r.symbol}</div>
              )}
              <div className="mt-2 text-2xl">
                {r.price == null ? '-' : r.price.toLocaleString(locale)}
              </div>
              <div className={`mt-1 text-sm ${changeColor}`}>
                {r.chg == null
                  ? '-'
                  : `${arrow} ${sign}${r.chg.toLocaleString(locale)} (${sign}${(r.chgPct ?? 0).toFixed(2)}%)`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}