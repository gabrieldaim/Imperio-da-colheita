export const STORAGE_KEY = 'imperio-da-colheita:v1'
export const STARTING_MONEY = 100
export const LAND_BASE_PRICE = 80
export const LAND_GROWTH = 1.8
export const MAX_PLOTS = 20
export const MAX_WORKER_LEVEL = 10
export const VENTURES = [
  { id: 'hortifruti', name: 'Hortifrúti', icon: '🥬', openingCost: 40000 },
]
export const ROLES = [
  { id: 'planter', name: 'Plantador', icon: '🌱', basePrice: 180, ability: 'Semente grátis' },
  { id: 'irrigator', name: 'Regador', icon: '💧', basePrice: 150, ability: 'Rega pela metade do tempo' },
  { id: 'harvester', name: 'Colhedor', icon: '🧺', basePrice: 200, ability: 'Colheita em dobro' },
  { id: 'loader', name: 'Carregador', icon: '📦', basePrice: 6000, ability: 'Segue o plano de carregamento do caminhão' },
  { id: 'driver', name: 'Motorista', icon: '🚚', basePrice: 8000, ability: 'Escolhe o destino e inicia a viagem' },
]

// Keep the balancing rules here so new trade layers can use the same economy.
export const CROPS = [
  { id: 'wheat', name: 'Trigo', icon: '🌾', cost: 8, value: 40, seconds: 10, color: '#e5ad48' },
  { id: 'corn', name: 'Milho', icon: '🌽', cost: 25, value: 110, seconds: 21, color: '#edc153' },
  { id: 'tomato', name: 'Tomate', icon: '🍅', cost: 70, value: 300, seconds: 39, color: '#dc6950' },
  { id: 'strawberry', name: 'Morango', icon: '🍓', cost: 190, value: 820, seconds: 64, color: '#d65c73' },
  { id: 'grape', name: 'Uva', icon: '🍇', cost: 520, value: 2200, seconds: 100, color: '#8a70bd' },
]

export const PHASES = ['planting', 'watering', 'harvesting']

export function initialGame() {
  return {
    version: 1,
    money: STARTING_MONEY,
    plots: [],
    progress: Object.fromEntries(CROPS.map(crop => [crop.id, { xp: 0 }])),
    inventory: [],
    totalHarvests: 0,
    totalSales: 0,
    workers: [],
    nextWorkerId: 1,
    simulatedAt: Date.now(),
    ventures: [],
    trucks: [],
    nextTruckId: 1,
  }
}

export function levelForXp(xp) {
  let level = 1
  let required = 0
  while (level < 50 && xp >= required + level + 1) {
    required += level + 1
    level++
  }
  return level
}

export function xpAtLevel(level) {
  return (level - 1) * (level + 2) / 2
}

export function nextLevelXp(level) {
  return xpAtLevel(level + 1)
}

export function cropLevel(game, cropId) {
  return levelForXp(game.progress[cropId]?.xp ?? 0)
}

export function isUnlocked(game, cropIndex) {
  return cropIndex === 0 || cropLevel(game, CROPS[cropIndex - 1].id) >= 5
}

export function cropStats(crop, level) {
  return {
    seconds: Math.max(1, Math.ceil(crop.seconds * Math.max(0.2, 1 - (level - 1) * 0.05))),
    value: Math.round(crop.value * (1 + (level - 1) * 0.08)),
    cost: crop.cost,
  }
}

export function landPrice(owned) {
  return Math.round(LAND_BASE_PRICE * LAND_GROWTH ** owned)
}

export function openVenture(game, type, now = Date.now()) {
  const venture = VENTURES.find(item => item.id === type)
  if (!venture || game.money < venture.openingCost || (game.ventures ?? []).some(item => item.type === type || (type === 'hortifruti' && item.type === 'restaurant'))) return game
  return {
    ...game,
    money: game.money - venture.openingCost,
    simulatedAt: now,
    ventures: [...(game.ventures ?? []), { id: type, type, name: venture.name, stock: [], capacity: 15, stockUpgrades: 0, receivedUnits: 0, deliveries: 0,
      salesUpgrades: { marketing: 0, conversion: 0, additional: 0 }, nextSalesAt: now + 120000,
      salesCycles: 0, salesTotals: { visits: 0, buyers: 0, missed: 0, units: 0, revenue: 0 }, salesReports: [] }],
  }
}

export function stockUpgradePrice(venture) {
  return Math.round(6000 * 1.8 ** (venture.stockUpgrades ?? 0))
}

export function expandVentureStock(game, ventureId, now = Date.now()) {
  const venture = (game.ventures ?? []).find(item => item.id === ventureId)
  if (!venture || game.money < stockUpgradePrice(venture)) return game
  return { ...game, money: game.money - stockUpgradePrice(venture), simulatedAt: now,
    ventures: game.ventures.map(item => item.id === ventureId ?
      { ...item, capacity: (item.capacity ?? 15) + 15, stockUpgrades: (item.stockUpgrades ?? 0) + 1 } : item) }
}

export function hirePrice(game, roleId) {
  const role = ROLES.find(item => item.id === roleId)
  return role ? Math.round(role.basePrice * 1.8 ** (game.workers ?? []).filter(worker => worker.role === roleId).length) : Infinity
}

export function upgradePrice(worker) {
  const role = ROLES.find(item => item.id === worker.role)
  return role && worker.level < MAX_WORKER_LEVEL ? Math.round(role.basePrice * 1.6 ** worker.level) : Infinity
}

export function abilityChance(level) {
  return Math.min(55, 10 + (level - 1) * 5) / 100
}

export function hireWorker(game, roleId, now = Date.now()) {
  const price = hirePrice(game, roleId)
  if (!Number.isFinite(price) || game.money < price) return game
  const id = game.nextWorkerId ?? Math.max(0, ...(game.workers ?? []).map(item => item.id)) + 1
  return { ...game, money: game.money - price, nextWorkerId: id + 1, simulatedAt: now,
    workers: [...(game.workers ?? []), { id, role: roleId, level: 1, plots: [], trucks: [], cropId: 'wheat' }] }
}

export function upgradeWorker(game, workerId, now = Date.now()) {
  const worker = (game.workers ?? []).find(item => item.id === workerId)
  if (!worker || game.money < upgradePrice(worker)) return game
  return { ...game, money: game.money - upgradePrice(worker), simulatedAt: now,
    workers: game.workers.map(item => item.id === workerId ? { ...item, level: item.level + 1 } : item) }
}

export function toggleWorkerPlot(game, workerId, plotId, now = Date.now()) {
  const worker = (game.workers ?? []).find(item => item.id === workerId)
  if (!worker || !['planter', 'irrigator', 'harvester'].includes(worker.role) || !game.plots.some(plot => plot.id === plotId)) return game
  const plots = worker.plots ?? []
  const selected = plots.includes(plotId)
  if (!selected && (plots.length >= worker.level || game.workers.some(item => item.id !== workerId && item.role === worker.role && item.plots?.includes(plotId)))) return game
  return { ...game, simulatedAt: now, workers: game.workers.map(item => item.id === workerId ?
    { ...item, plots: selected ? plots.filter(id => id !== plotId) : [...plots, plotId] } : item) }
}

export function chooseWorkerCrop(game, workerId, cropId, now = Date.now()) {
  const worker = (game.workers ?? []).find(item => item.id === workerId)
  const index = CROPS.findIndex(item => item.id === cropId)
  if (!worker || worker.role !== 'planter' || index < 0 || !isUnlocked(game, index)) return game
  return { ...game, simulatedAt: now, workers: game.workers.map(item => item.id === workerId ? { ...item, cropId } : item) }
}

export function buyLand(game) {
  if (game.plots.length >= MAX_PLOTS || game.money < landPrice(game.plots.length)) return game
  return {
    ...game,
    money: game.money - landPrice(game.plots.length),
    plots: [...game.plots, { id: game.plots.length + 1, crop: null }],
  }
}

export function plantCrop(game, plotId, cropId, now, free = false) {
  const plot = game.plots.find(item => item.id === plotId)
  const index = CROPS.findIndex(item => item.id === cropId)
  if (!plot || plot.crop || index < 0 || !isUnlocked(game, index)) return game
  const crop = CROPS[index]
  if (!free && game.money < crop.cost) return game
  const level = cropLevel(game, cropId)
  const stats = cropStats(crop, level)
  return {
    ...game,
    money: game.money - (free ? 0 : crop.cost),
    plots: game.plots.map(item => item.id !== plotId ? item : {
      ...item,
      crop: { cropId, level, value: stats.value, seconds: stats.seconds, phaseSeconds: stats.seconds, phase: 'planting', readyAt: now + stats.seconds * 1000 },
    }),
  }
}

export function advancePlot(game, plotId, now, options = {}) {
  const plot = game.plots.find(item => item.id === plotId)
  const planted = plot?.crop
  if (!planted || now < planted.readyAt) return game
  const index = PHASES.indexOf(planted.phase)
  if (index === 0 || index === 1) {
    const duration = index === 0 && options.fastWater ? Math.max(1, Math.ceil(planted.seconds / 2)) : planted.seconds
    return {
      ...game,
      plots: game.plots.map(item => item.id !== plotId ? item : {
        ...item,
        crop: { ...planted, phase: PHASES[index + 1], phaseSeconds: duration, readyAt: now + duration * 1000 },
      }),
    }
  }
  if (index !== 2) return game
  const inventory = [...game.inventory]
  const batch = inventory.find(item => item.cropId === planted.cropId && item.value === planted.value)
  const quantity = options.doubleHarvest ? 2 : 1
  if (batch) inventory[inventory.indexOf(batch)] = { ...batch, quantity: batch.quantity + quantity }
  else inventory.push({ cropId: planted.cropId, value: planted.value, quantity })
  return {
    ...game,
    plots: game.plots.map(item => item.id !== plotId ? item : { ...item, crop: null }),
    inventory,
    progress: { ...game.progress, [planted.cropId]: { xp: (game.progress[planted.cropId]?.xp ?? 0) + 1 } },
    totalHarvests: game.totalHarvests + 1,
  }
}

function defaultRoll(worker, plot, time) {
  const seed = worker.id * 73856093 + plot.id * 19349663 + Math.floor(time / 1000) * 83492791
  return (Math.imul(seed, 2654435761) >>> 0) / 4294967296
}

// Process deadlines in chronological order so a worker can complete several
// cycles while the page was closed. No product is sold automatically.
export function simulateWorkers(game, now = Date.now(), roll = defaultRoll) {
  if (!(game.workers ?? []).some(worker => worker.plots?.length)) return game
  let state = game
  let cursor = Math.min(now, game.simulatedAt ?? now)
  let changed = false
  for (let count = 0; count < 20000; count++) {
    const jobs = []
    for (const plot of state.plots) {
      const role = !plot.crop ? 'planter' : ({ planting: 'irrigator', watering: 'harvester', harvesting: 'harvester' })[plot.crop.phase]
      const worker = state.workers.find(item => item.role === role && item.plots?.includes(plot.id))
      if (!worker) continue
      const time = plot.crop ? Math.max(cursor, plot.crop.readyAt) : cursor
      if (time <= now) jobs.push({ plot, worker, time })
    }
    jobs.sort((a, b) => a.time - b.time || a.plot.id - b.plot.id)
    let action = null
    for (const job of jobs) {
      const { plot, worker, time } = job
      const special = roll(worker, plot, time) < abilityChance(worker.level)
      let next
      if (!plot.crop) {
        const crop = CROPS.find(item => item.id === worker.cropId)
        if (!crop || !isUnlocked(state, CROPS.indexOf(crop))) continue
        next = plantCrop(state, plot.id, crop.id, time, special)
      } else {
        next = advancePlot(state, plot.id, time, {
          fastWater: plot.crop.phase === 'planting' && special,
          doubleHarvest: plot.crop.phase === 'harvesting' && special,
        })
      }
      if (next !== state) { action = { next, time }; break }
    }
    if (!action) break
    state = action.next
    cursor = action.time
    changed = true
  }
  return changed ? { ...state, simulatedAt: now } : game
}

export function sellCrop(game, cropId, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return game
  let remaining = quantity
  let earned = 0
  const inventory = game.inventory.map(batch => {
    if (batch.cropId !== cropId || remaining === 0) return batch
    const sold = Math.min(batch.quantity, remaining)
    remaining -= sold
    earned += sold * Math.floor(batch.value * 0.5)
    return { ...batch, quantity: batch.quantity - sold }
  }).filter(batch => batch.quantity > 0)
  if (remaining > 0) return game
  return { ...game, inventory, money: game.money + earned, totalSales: game.totalSales + earned }
}

export function loadGame(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return initialGame()
    const parsed = JSON.parse(raw)
    if (parsed.version !== 1 || !Number.isSafeInteger(parsed.money) || parsed.money < 0 ||
      !Array.isArray(parsed.plots) || parsed.plots.length > MAX_PLOTS ||
      !Array.isArray(parsed.inventory) || !parsed.progress || typeof parsed.progress !== 'object') return initialGame()
    return { ...parsed, workers: Array.isArray(parsed.workers) ? parsed.workers : [],
      nextWorkerId: parsed.nextWorkerId ?? 1, simulatedAt: parsed.simulatedAt ?? Date.now(),
      ventures: Array.isArray(parsed.ventures) ? parsed.ventures.map(item => ({
        ...item, ...(item.type === 'restaurant' ? { id: 'hortifruti', type: 'hortifruti', name: 'Hortifrúti' } : {}),
        capacity: item.capacity ?? 15, stockUpgrades: item.stockUpgrades ?? 0,
        receivedUnits: item.receivedUnits ?? 0, deliveries: item.deliveries ?? 0,
        salesUpgrades: { marketing: 0, conversion: 0, additional: 0, ...item.salesUpgrades },
        nextSalesAt: Number.isFinite(item.nextSalesAt) ? item.nextSalesAt : Date.now() + 120000,
        salesCycles: item.salesCycles ?? 0,
        salesTotals: item.salesTotals ?? { visits: 0, buyers: 0, missed: 0, units: 0, revenue: 0 },
        salesReports: Array.isArray(item.salesReports) ? item.salesReports : [],
      })) : [],
      trucks: Array.isArray(parsed.trucks) ? parsed.trucks : [], nextTruckId: parsed.nextTruckId ?? 1 }
  } catch {
    return initialGame()
  }
}
