export const STORAGE_KEY = 'imperio-da-colheita:v1'
export const STARTING_MONEY = 100
export const LAND_BASE_PRICE = 80
export const LAND_GROWTH = 1.8
export const MAX_PLOTS = 20

// Keep the balancing rules here so new trade layers can use the same economy.
export const CROPS = [
  { id: 'wheat', name: 'Trigo', icon: '🌾', cost: 8, value: 40, seconds: 10, color: '#e5ad48' },
  { id: 'corn', name: 'Milho', icon: '🌽', cost: 25, value: 110, seconds: 38, color: '#edc153' },
  { id: 'tomato', name: 'Tomate', icon: '🍅', cost: 70, value: 300, seconds: 70, color: '#dc6950' },
  { id: 'strawberry', name: 'Morango', icon: '🍓', cost: 190, value: 820, seconds: 115, color: '#d65c73' },
  { id: 'grape', name: 'Uva', icon: '🍇', cost: 520, value: 2200, seconds: 180, color: '#8a70bd' },
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

export function buyLand(game) {
  if (game.plots.length >= MAX_PLOTS || game.money < landPrice(game.plots.length)) return game
  return {
    ...game,
    money: game.money - landPrice(game.plots.length),
    plots: [...game.plots, { id: game.plots.length + 1, crop: null }],
  }
}

export function plantCrop(game, plotId, cropId, now) {
  const plot = game.plots.find(item => item.id === plotId)
  const index = CROPS.findIndex(item => item.id === cropId)
  if (!plot || plot.crop || index < 0 || !isUnlocked(game, index)) return game
  const crop = CROPS[index]
  if (game.money < crop.cost) return game
  const level = cropLevel(game, cropId)
  const stats = cropStats(crop, level)
  return {
    ...game,
    money: game.money - crop.cost,
    plots: game.plots.map(item => item.id !== plotId ? item : {
      ...item,
      crop: { cropId, level, value: stats.value, seconds: stats.seconds, phase: 'planting', readyAt: now + stats.seconds * 1000 },
    }),
  }
}

export function advancePlot(game, plotId, now) {
  const plot = game.plots.find(item => item.id === plotId)
  const planted = plot?.crop
  if (!planted || now < planted.readyAt) return game
  const index = PHASES.indexOf(planted.phase)
  if (index === 0 || index === 1) {
    return {
      ...game,
      plots: game.plots.map(item => item.id !== plotId ? item : {
        ...item,
        crop: { ...planted, phase: PHASES[index + 1], readyAt: now + planted.seconds * 1000 },
      }),
    }
  }
  if (index !== 2) return game
  const inventory = [...game.inventory]
  const batch = inventory.find(item => item.cropId === planted.cropId && item.value === planted.value)
  if (batch) inventory[inventory.indexOf(batch)] = { ...batch, quantity: batch.quantity + 1 }
  else inventory.push({ cropId: planted.cropId, value: planted.value, quantity: 1 })
  return {
    ...game,
    plots: game.plots.map(item => item.id !== plotId ? item : { ...item, crop: null }),
    inventory,
    progress: { ...game.progress, [planted.cropId]: { xp: (game.progress[planted.cropId]?.xp ?? 0) + 1 } },
    totalHarvests: game.totalHarvests + 1,
  }
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
    return parsed
  } catch {
    return initialGame()
  }
}
