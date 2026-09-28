import { CROPS, simulateWorkers } from './game.js'

export const TRUCK_MODELS = [
  { id: 'small', name: 'Caminhão leve', capacity: 25, price: 12000, travelSeconds: 30 },
  { id: 'medium', name: 'Caminhão médio', capacity: 50, price: 28000, travelSeconds: 45 },
  { id: 'large', name: 'Caminhão grande', capacity: 75, price: 48000, travelSeconds: 60 },
  { id: 'heavy', name: 'Caminhão pesado', capacity: 100, price: 75000, travelSeconds: 75 },
]

export const unitCount = batches => (batches ?? []).reduce((sum, item) => sum + item.quantity, 0)
export const truckModel = truck => TRUCK_MODELS.find(item => item.id === truck.modelId)

function replaceTruck(game, updated) {
  return { ...game, trucks: game.trucks.map(item => item.id === updated.id ? updated : item) }
}

function addBatch(batches, item) {
  const next = [...batches]
  const index = next.findIndex(batch => batch.cropId === item.cropId && batch.value === item.value)
  if (index < 0) next.push({ ...item })
  else next[index] = { ...next[index], quantity: next[index].quantity + item.quantity }
  return next
}

function takeBatches(batches, cropId, quantity) {
  let remaining = quantity
  let moved = []
  const rest = batches.map(batch => {
    if (remaining === 0 || batch.cropId !== cropId) return batch
    const count = Math.min(batch.quantity, remaining)
    remaining -= count
    moved = addBatch(moved, { cropId, value: batch.value, quantity: count })
    return { ...batch, quantity: batch.quantity - count }
  }).filter(batch => batch.quantity > 0)
  return remaining === 0 ? { moved, rest } : null
}

export function buyTruck(game, modelId, now = Date.now()) {
  const model = TRUCK_MODELS.find(item => item.id === modelId)
  if (!model || game.money < model.price) return game
  const id = game.nextTruckId ?? Math.max(0, ...(game.trucks ?? []).map(item => item.id)) + 1
  const truck = { id, modelId, status: 'garage', cargo: [], destinationId: null, readyAt: null,
    config: { minDispatch: Math.ceil(model.capacity / 2),
      rules: CROPS.map((crop, priority) => ({ cropId: crop.id, priority, max: model.capacity, reserve: 0 })) } }
  return { ...game, money: game.money - model.price, trucks: [...(game.trucks ?? []), truck],
    nextTruckId: id + 1, simulatedAt: now }
}

export function sellTruck(game, truckId, now = Date.now()) {
  const truck = (game.trucks ?? []).find(item => item.id === truckId)
  if (!truck || truck.status !== 'garage' || unitCount(truck.cargo) > 0) return game
  const model = truckModel(truck)
  return { ...game, money: game.money + Math.floor(model.price / 2), simulatedAt: now,
    trucks: game.trucks.filter(item => item.id !== truckId),
    workers: game.workers.map(worker => ({ ...worker, trucks: (worker.trucks ?? []).filter(id => id !== truckId) })) }
}

export function loadTruck(game, truckId, cropId, quantity, now = Date.now()) {
  const truck = (game.trucks ?? []).find(item => item.id === truckId)
  if (!truck || truck.status !== 'garage' || !Number.isSafeInteger(quantity) || quantity < 1 ||
      unitCount(truck.cargo) + quantity > truckModel(truck).capacity) return game
  const taken = takeBatches(game.inventory, cropId, quantity)
  if (!taken) return game
  let cargo = truck.cargo
  for (const item of taken.moved) cargo = addBatch(cargo, item)
  return { ...replaceTruck(game, { ...truck, cargo }), inventory: taken.rest, simulatedAt: now }
}

export function emptyTruckAtGarage(game, truckId, now = Date.now()) {
  const truck = (game.trucks ?? []).find(item => item.id === truckId)
  if (!truck || truck.status !== 'garage' || !unitCount(truck.cargo)) return game
  let inventory = game.inventory
  for (const item of truck.cargo) inventory = addBatch(inventory, item)
  return { ...replaceTruck(game, { ...truck, cargo: [] }), inventory, simulatedAt: now }
}

export function dispatchTruck(game, truckId, destinationId, now = Date.now()) {
  const truck = (game.trucks ?? []).find(item => item.id === truckId)
  const destination = (game.ventures ?? []).find(item => item.id === destinationId)
  if (!truck || truck.status !== 'garage' || !unitCount(truck.cargo) || !destination) return game
  return { ...replaceTruck(game, { ...truck, destinationId, status: 'outbound',
    readyAt: now + truckModel(truck).travelSeconds * 1000 }), simulatedAt: now }
}

export function configureTruck(game, truckId, config, now = Date.now()) {
  const truck = (game.trucks ?? []).find(item => item.id === truckId)
  if (!truck) return game
  const capacity = truckModel(truck).capacity
  const minDispatch = Number(config.minDispatch)
  if (!Number.isSafeInteger(minDispatch) || minDispatch < 1 || minDispatch > capacity ||
      !Array.isArray(config.rules) || config.rules.length !== CROPS.length) return game
  const rules = []
  for (const crop of CROPS) {
    const rule = config.rules.find(item => item.cropId === crop.id)
    if (!rule || rules.some(item => item.cropId === crop.id)) return game
    const max = Number(rule.max), reserve = Number(rule.reserve), priority = Number(rule.priority)
    if (![max, reserve, priority].every(Number.isSafeInteger) || max < 0 || max > capacity ||
      reserve < 0 || priority < 0 || priority >= CROPS.length) return game
    rules.push({ cropId: crop.id, max, reserve, priority })
  }
  if (new Set(rules.map(item => item.priority)).size !== CROPS.length) return game
  return { ...replaceTruck(game, { ...truck, config: { minDispatch, rules } }), simulatedAt: now }
}

export function toggleWorkerTruck(game, workerId, truckId, now = Date.now()) {
  const worker = (game.workers ?? []).find(item => item.id === workerId)
  if (!worker || !['loader', 'driver'].includes(worker.role) || !(game.trucks ?? []).some(item => item.id === truckId)) return game
  const trucks = worker.trucks ?? []
  const selected = trucks.includes(truckId)
  if (!selected && (trucks.length >= worker.level ||
    game.workers.some(item => item.id !== workerId && item.role === worker.role && item.trucks?.includes(truckId)))) return game
  return { ...game, simulatedAt: now, workers: game.workers.map(item => item.id === workerId ?
    { ...item, trucks: selected ? trucks.filter(id => id !== truckId) : [...trucks, truckId] } : item) }
}

function unloadIntoVenture(game, truck, time) {
  const venture = game.ventures.find(item => item.id === truck.destinationId)
  if (!venture) return game
  const free = Math.max(0, (venture.capacity ?? 15) - unitCount(venture.stock))
  let stock = venture.stock
  let cargo = truck.cargo
  let left = free
  for (const batch of truck.cargo) {
    if (!left) break
    const moved = Math.min(batch.quantity, left)
    stock = addBatch(stock, { ...batch, quantity: moved })
    cargo = takeBatches(cargo, batch.cropId, moved)?.rest ?? cargo
    left -= moved
  }
  const delivered = free - left
  const empty = unitCount(cargo) === 0
  const nextTruck = empty ? { ...truck, cargo, status: 'returning',
    readyAt: time + truckModel(truck).travelSeconds * 1000 } : { ...truck, cargo, status: 'unloading', readyAt: null }
  if (!delivered && !empty) return game
  return { ...replaceTruck(game, nextTruck), ventures: game.ventures.map(item => item.id === venture.id ?
    { ...item, stock, receivedUnits: (item.receivedUnits ?? 0) + delivered,
      deliveries: (item.deliveries ?? 0) + (empty ? 1 : 0) } : item) }
}

function autoLoad(game, truck, now) {
  let state = game
  for (const rule of [...truck.config.rules].sort((a, b) => a.priority - b.priority)) {
    const current = state.trucks.find(item => item.id === truck.id)
    const space = truckModel(current).capacity - unitCount(current.cargo)
    const already = current.cargo.filter(item => item.cropId === rule.cropId).reduce((sum, item) => sum + item.quantity, 0)
    const available = state.inventory.filter(item => item.cropId === rule.cropId).reduce((sum, item) => sum + item.quantity, 0)
    const count = Math.min(space, Math.max(0, rule.max - already), Math.max(0, available - rule.reserve))
    if (count > 0) state = loadTruck(state, truck.id, rule.cropId, count, now)
  }
  return state
}

export function simulateFreight(game, now = Date.now()) {
  if (!(game.trucks ?? []).length) return game
  let state = game
  // Resolve completed trips at their actual deadlines, including a completed return.
  for (let count = 0; count < 20000; count++) {
    const due = state.trucks.filter(truck => ['outbound', 'returning'].includes(truck.status) && truck.readyAt <= now)
      .sort((a, b) => a.readyAt - b.readyAt || a.id - b.id)[0]
    if (!due) break
    if (due.status === 'returning') state = replaceTruck(state, { ...due, status: 'garage', destinationId: null, readyAt: null })
    else state = replaceTruck(state, { ...due, status: 'unloading', arrivedAt: due.readyAt, readyAt: null })
    if (due.status === 'outbound') {
      const truck = state.trucks.find(item => item.id === due.id)
      state = unloadIntoVenture(state, truck, due.readyAt)
    }
  }
  // Waiting trucks unload in arrival order whenever storage space appears.
  for (const truck of [...state.trucks].filter(item => item.status === 'unloading')
    .sort((a, b) => a.arrivedAt - b.arrivedAt || a.id - b.id)) {
    state = unloadIntoVenture(state, state.trucks.find(item => item.id === truck.id), now)
  }
  // The loader follows a per-truck plan. The driver starts a trip once the
  // configured minimum load is reached, regardless of destination free space.
  for (const truck of [...state.trucks]) {
    let current = state.trucks.find(item => item.id === truck.id)
    if (current.status !== 'garage') continue
    if (state.workers.some(worker => worker.role === 'loader' && worker.trucks?.includes(current.id))) {
      state = autoLoad(state, current, now)
      current = state.trucks.find(item => item.id === truck.id)
    }
    if (state.workers.some(worker => worker.role === 'driver' && worker.trucks?.includes(current.id)) &&
      unitCount(current.cargo) >= (current.config?.minDispatch ?? 1) && state.ventures.length) {
      const destination = [...state.ventures].sort((a, b) =>
        ((b.capacity ?? 15) - unitCount(b.stock)) - ((a.capacity ?? 15) - unitCount(a.stock)))[0]
      state = dispatchTruck(state, current.id, destination.id, now)
    }
  }
  return state === game ? game : { ...state, simulatedAt: now }
}

export function simulateGame(game, now = Date.now()) {
  let state = game
  let cursor = Math.min(now, game.simulatedAt ?? now)
  let changed = false
  for (let count = 0; count < 20000; count++) {
    const next = simulateFreight(simulateWorkers(state, cursor), cursor)
    if (next !== state) { state = next; changed = true }
    const deadlines = []
    for (const plot of state.plots) {
      if (!plot.crop || plot.crop.readyAt <= cursor) continue
      const role = ({ planting: 'irrigator', watering: 'harvester', harvesting: 'harvester' })[plot.crop.phase]
      if (state.workers.some(worker => worker.role === role && worker.plots?.includes(plot.id))) deadlines.push(plot.crop.readyAt)
    }
    for (const truck of state.trucks ?? []) {
      if (['outbound', 'returning'].includes(truck.status) && truck.readyAt > cursor) deadlines.push(truck.readyAt)
    }
    const nextTime = Math.min(...deadlines)
    if (nextTime > now || !Number.isFinite(nextTime)) return changed ? { ...state, simulatedAt: now } : game
    cursor = nextTime
  }
  // A large offline backlog resumes on the next tick from the last deadline.
  return changed ? { ...state, simulatedAt: cursor } : game
}
