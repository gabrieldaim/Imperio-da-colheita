import { CROPS } from './game.js'

export const SALES_CYCLE_MS = 120000
export const SALES_UPGRADES = [
  { id: 'marketing', name: 'Marketing', icon: '📣', basePrice: 500, growth: 1.8, maxLevel: 20 },
  { id: 'conversion', name: 'Conversão', icon: '🛍️', basePrice: 700, growth: 1.8, maxLevel: 10 },
  { id: 'additional', name: 'Venda adicional', icon: '➕', basePrice: 900, growth: 1.8, maxLevel: 8 },
]

export const salesStats = venture => {
  const { marketing = 0, conversion = 0, additional = 0 } = venture.salesUpgrades ?? {}
  return { minVisits: 0, maxVisits: 2 + marketing, conversion: Math.min(90, 40 + conversion * 5),
    additional: Math.min(80, additional * 10) }
}

export function salesUpgradePrice(venture, id) {
  const upgrade = SALES_UPGRADES.find(item => item.id === id)
  if (!upgrade) return Infinity
  const level = venture.salesUpgrades?.[id] ?? 0
  return level < upgrade.maxLevel ? Math.round(upgrade.basePrice * upgrade.growth ** level) : Infinity
}

export function buySalesUpgrade(game, ventureId, id, now = Date.now()) {
  const venture = (game.ventures ?? []).find(item => item.id === ventureId)
  const price = venture && salesUpgradePrice(venture, id)
  if (!Number.isFinite(price) || game.money < price) return game
  return { ...game, money: game.money - price, simulatedAt: now,
    ventures: game.ventures.map(item => item.id === ventureId ? { ...item, salesUpgrades: {
      ...item.salesUpgrades, [id]: (item.salesUpgrades?.[id] ?? 0) + 1,
    } } : item) }
}

// Stable draws make an offline cycle produce the same result on every replay.
function draw(cycle, visitor, step) {
  let seed = Math.imul(cycle + 1, 0x9e3779b1) ^ Math.imul(visitor + 1, 0x85ebca6b) ^ Math.imul(step + 1, 0xc2b2ae35)
  seed ^= seed >>> 16
  seed = Math.imul(seed, 0x7feb352d)
  seed ^= seed >>> 15
  seed = Math.imul(seed, 0x846ca68b)
  return ((seed ^ seed >>> 16) >>> 0) / 4294967296
}

export function runSalesCycle(game, ventureId, at) {
  const venture = (game.ventures ?? []).find(item => item.id === ventureId)
  if (!venture || !Number.isFinite(venture.nextSalesAt) || venture.nextSalesAt > at) return game
  const cycle = venture.salesCycles ?? 0
  const stats = salesStats(venture)
  const visits = Math.floor(draw(cycle, 0, 0) * (stats.maxVisits + 1))
  let stock = [...venture.stock]
  let buyers = 0, missed = 0, units = 0, revenue = 0
  const products = {}
  for (let visitor = 0; visitor < visits; visitor++) {
    if (draw(cycle, visitor, 1) >= stats.conversion / 100) continue
    const available = CROPS.filter(crop => stock.some(batch => batch.cropId === crop.id && batch.quantity > 0))
    if (!available.length) { missed++; continue }
    // Each crop is a choice; cheaper products receive a larger weight.
    const weights = available.map(crop => 1 / Math.sqrt(crop.value))
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let pick = draw(cycle, visitor, 2) * total
    let cropId = available.at(-1).id
    for (let i = 0; i < available.length; i++) {
      pick -= weights[i]
      if (pick < 0) { cropId = available[i].id; break }
    }
    let wanted = 1 + Number(draw(cycle, visitor, 3) < stats.additional / 100)
    buyers++
    stock = stock.map(batch => {
      if (batch.cropId !== cropId || !wanted) return batch
      const quantity = Math.min(batch.quantity, wanted)
      wanted -= quantity
      units += quantity
      revenue += quantity * batch.value
      const entry = products[cropId] ?? { quantity: 0, revenue: 0 }
      products[cropId] = { quantity: entry.quantity + quantity, revenue: entry.revenue + quantity * batch.value }
      return { ...batch, quantity: batch.quantity - quantity }
    }).filter(batch => batch.quantity > 0)
  }
  const report = { cycle: cycle + 1, at: venture.nextSalesAt, visits, buyers, missed, units, revenue, products }
  const totals = venture.salesTotals ?? { visits: 0, buyers: 0, missed: 0, units: 0, revenue: 0 }
  return { ...game, money: game.money + revenue, ventures: game.ventures.map(item => item.id === ventureId ? {
    ...item, stock, salesCycles: cycle + 1, nextSalesAt: item.nextSalesAt + SALES_CYCLE_MS,
    salesTotals: Object.fromEntries(['visits', 'buyers', 'missed', 'units', 'revenue'].map(key => [key, (totals[key] ?? 0) + report[key]])),
    salesReports: [report, ...(item.salesReports ?? [])].slice(0, 20),
  } : item) }
}

export function simulateSales(game, now) {
  let state = game
  for (const venture of game.ventures ?? []) state = runSalesCycle(state, venture.id, now)
  return state
}
