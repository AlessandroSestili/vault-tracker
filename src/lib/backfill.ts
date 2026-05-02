import { createClient } from '@/lib/supabase/server'
import {
  searchTicker,
  fetchYahooHistory,
  fetchExchangeRatesHistory,
  toEurOnDate,
  normalizeCommodityPrice,
  type ExchangeRates,
} from '@/lib/yahoo-finance'
import type { Position } from '@/types'

// Auto-healing: per ogni live position con ISIN, fetch 1y Yahoo history
// e FX storici, calcola value_eur per giorno, insert dei soli giorni mancanti.
// Idempotente e safe da chiamare ad ogni page load.
export async function backfillMissingHistory(
  positions: Position[],
  rates: ExchangeRates
): Promise<void> {
  const live = positions.filter((p) => !p.is_manual && p.isin && p.units !== null)
  if (live.length === 0) return

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('position_snapshots')
    .select('position_id, recorded_at')
    .in('position_id', live.map((p) => p.id))

  const existingByPosition = new Map<string, Set<string>>()
  for (const row of existing ?? []) {
    const date = (row.recorded_at as string).slice(0, 10)
    if (!existingByPosition.has(row.position_id)) existingByPosition.set(row.position_id, new Set())
    existingByPosition.get(row.position_id)!.add(date)
  }

  const fxHistory = await fetchExchangeRatesHistory('1y')
  const today = new Date().toISOString().slice(0, 10)
  const recalcFrom = new Date()
  recalcFrom.setDate(recalcFrom.getDate() - 7)
  const recalcCutoff = recalcFrom.toISOString().slice(0, 10)

  await Promise.allSettled(
    live.map(async (pos) => {
      const ticker = await searchTicker(pos.isin!)
      if (!ticker) return
      const series = await fetchYahooHistory(ticker, '1y')
      if (!series || series.points.length === 0) return

      const existingDates = existingByPosition.get(pos.id) ?? new Set<string>()
      const units = pos.units ?? 0
      const rows: { position_id: string; value_eur: number; recorded_at: string }[] = []

      for (const point of series.points) {
        if (point.date >= today) continue
        // skip only dates outside the 7-day recalc window that already have a value
        if (existingDates.has(point.date) && point.date < recalcCutoff) continue
        const rawPrice = normalizeCommodityPrice(point.price, pos.isin!)
        const priceEur = toEurOnDate(rawPrice, series.currency, point.date, fxHistory, rates)
        const valueEur = priceEur * units
        if (!Number.isFinite(valueEur) || valueEur <= 0) continue
        rows.push({ position_id: pos.id, value_eur: valueEur, recorded_at: point.date })
      }

      if (rows.length === 0) return

      const BATCH = 500
      for (let i = 0; i < rows.length; i += BATCH) {
        await supabase
          .from('position_snapshots')
          .upsert(rows.slice(i, i + BATCH), {
            onConflict: 'position_id,recorded_at',
            ignoreDuplicates: false,
          })
      }
    })
  )
}
