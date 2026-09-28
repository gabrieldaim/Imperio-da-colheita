import test from 'node:test'
import assert from 'node:assert/strict'
import { CROPS, VENTURES, abilityChance, advancePlot, buyLand, chooseWorkerCrop, cropLevel, cropStats, expandVentureStock, hirePrice, hireWorker, initialGame, isUnlocked, landPrice, loadGame, openVenture, plantCrop, sellCrop, simulateWorkers, toggleWorkerPlot, upgradePrice, upgradeWorker } from './game.js'
import { TRUCK_MODELS, buyTruck, configureTruck, dispatchTruck, emptyTruckAtGarage, loadTruck, sellTruck, simulateFreight, simulateGame, toggleWorkerTruck, unitCount } from './logistics.js'

test('the first land leaves enough money for wheat and successive land prices rise', () => {
  const start = initialGame()
  const owned = buyLand(start)
  assert.equal(owned.plots.length, 1)
  assert.ok(owned.money >= CROPS[0].cost)
  assert.ok(landPrice(9) > landPrice(8) * 1.7)
})

test('each phase waits for its deadline and a separate click, even after a long absence', () => {
  let game = buyLand(initialGame())
  game = plantCrop(game, 1, 'wheat', 1000)
  const deadline = game.plots[0].crop.readyAt
  assert.equal(advancePlot(game, 1, deadline - 1), game)
  game = advancePlot(game, 1, deadline + 1000000)
  assert.equal(game.plots[0].crop.phase, 'watering')
  assert.equal(game.plots[0].crop.readyAt, deadline + 1000000 + CROPS[0].seconds * 1000)
  game = advancePlot(game, 1, game.plots[0].crop.readyAt)
  assert.equal(game.plots[0].crop.phase, 'harvesting')
  game = advancePlot(game, 1, game.plots[0].crop.readyAt)
  assert.equal(game.plots[0].crop, null)
  assert.equal(game.inventory[0].quantity, 1)
  assert.equal(game.progress.wheat.xp, 1)
})

test('seed progression is shared across plots and unlocks the next crop at level 5', () => {
  let game = buyLand(initialGame())
  assert.equal(isUnlocked(game, 1), false)
  assert.equal(plantCrop(game, 1, 'corn', 0), game)
  game = { ...game, progress: { ...game.progress, wheat: { xp: 14 } } }
  assert.equal(cropLevel(game, 'wheat'), 5)
  assert.equal(isUnlocked(game, 1), true)
  assert.ok(cropStats(CROPS[0], 5).seconds < cropStats(CROPS[0], 1).seconds)
  assert.ok(cropStats(CROPS[0], 5).value > cropStats(CROPS[0], 1).value)
  assert.ok(cropStats(CROPS[1], 1).seconds > cropStats(CROPS[0], 5).seconds)
  assert.equal(cropStats(CROPS[0], 17).seconds, 2)
  assert.equal(cropStats(CROPS[0], 50).seconds, 2)
})

test('stock keeps harvest value at collection, and selling one or all pays half', () => {
  const game = { ...initialGame(), inventory: [{ cropId: 'wheat', value: 40, quantity: 2 }, { cropId: 'wheat', value: 43, quantity: 1 }] }
  const one = sellCrop(game, 'wheat', 1)
  assert.equal(one.money, 120)
  assert.equal(one.inventory[0].quantity, 1)
  const all = sellCrop(one, 'wheat', 2)
  assert.equal(all.money, 161)
  assert.equal(all.inventory.length, 0)
  assert.equal(sellCrop(game, 'wheat', 5), game)
})

test('malformed saved game starts fresh', () => {
  assert.deepEqual(loadGame({ getItem: () => '{broken' }), initialGame())
  assert.deepEqual(loadGame({ getItem: () => JSON.stringify({ version: 1, money: -5, plots: [], inventory: [], progress: {} }) }), initialGame())
})

test('all crop times follow the proportional reduction from 18 to 10 seconds', () => {
  assert.deepEqual(CROPS.map(item => item.seconds), [10, 21, 39, 64, 100])
  assert.equal(cropStats(CROPS[0], 17).seconds, 2)
})

test('employees are upgraded with money, gain no XP, and can cover one extra plot per level', () => {
  let game = { ...buyLand(buyLand({ ...initialGame(), money: 3000 })), money: 2000 }
  const firstPrice = hirePrice(game, 'planter')
  game = hireWorker(game, 'planter', 0)
  assert.equal(game.money, 2000 - firstPrice)
  assert.equal(hirePrice(game, 'planter'), Math.round(firstPrice * 1.8))
  const workerId = game.workers[0].id
  game = toggleWorkerPlot(game, workerId, 1, 0)
  assert.deepEqual(game.workers[0].plots, [1])
  assert.equal(toggleWorkerPlot(game, workerId, 2, 0), game)
  const price = upgradePrice(game.workers[0])
  game = upgradeWorker(game, workerId, 0)
  assert.equal(game.workers[0].level, 2)
  game = toggleWorkerPlot(game, workerId, 2, 0)
  assert.deepEqual(game.workers[0].plots, [1, 2])
  assert.equal(game.money, 2000 - firstPrice - price)
  assert.equal('xp' in game.workers[0], false)
  assert.equal(abilityChance(2), 0.15)
  assert.equal(abilityChance(10), 0.55)
  assert.equal(chooseWorkerCrop(game, workerId, 'corn', 0), game)
})

test('assigned employees process an offline cycle and apply all three abilities', () => {
  let game = { ...buyLand(initialGame()), money: 2000 }
  for (const role of ['planter', 'irrigator', 'harvester']) {
    game = hireWorker(game, role, 0)
    game = toggleWorkerPlot(game, game.workers.at(-1).id, 1, 0)
  }
  const moneyBefore = game.money
  game = simulateWorkers(game, 30000, () => 0)
  assert.equal(game.inventory[0].quantity, 2)
  assert.equal(game.progress.wheat.xp, 1)
  assert.equal(game.totalHarvests, 1)
  assert.equal(game.money, moneyBefore) // free planting, no wages
  assert.equal(game.plots[0].crop.phase, 'planting') // next cycle already started
  assert.equal(game.plots[0].crop.readyAt, 35000)
  assert.equal(simulateWorkers(game, 30000, () => 0), game)
})

test('old saves load with an empty team', () => {
  const old = initialGame()
  delete old.workers
  delete old.nextWorkerId
  delete old.simulatedAt
  const restored = loadGame({ getItem: () => JSON.stringify(old) })
  assert.deepEqual(restored.workers, [])
  assert.equal(restored.nextWorkerId, 1)
  assert.deepEqual(restored.ventures, [])
})

test('a hortifruti opens once, costs money and starts with its own empty stock', () => {
  let game = { ...initialGame(), money: 50000, inventory: [{ cropId: 'wheat', value: 40, quantity: 3 }] }
  game = openVenture(game, 'hortifruti', 100)
  assert.equal(game.money, 50000 - VENTURES[0].openingCost)
  assert.deepEqual(game.ventures[0].stock, [])
  assert.equal(game.ventures[0].capacity, 15)
  assert.equal(game.inventory[0].quantity, 3)
  assert.equal(openVenture(game, 'hortifruti', 200), game)
  const poor = { ...initialGame(), money: 39999 }
  assert.equal(openVenture(poor, 'hortifruti'), poor)
})

test('existing restaurant purchase becomes a hortifruti without losing stock or money', () => {
  const old = { ...initialGame(), money: 321,
    ventures: [{ id: 'restaurant', type: 'restaurant', name: 'Restaurante',
      stock: [{ cropId: 'tomato', quantity: 4, value: 300 }] }] }
  const restored = loadGame({ getItem: () => JSON.stringify(old) })
  assert.equal(restored.money, 321)
  assert.equal(restored.ventures[0].type, 'hortifruti')
  assert.equal(restored.ventures[0].name, 'Hortifrúti')
  assert.equal(restored.ventures[0].stock[0].quantity, 4)
  assert.equal(restored.ventures[0].capacity, 15)
  assert.deepEqual(restored.trucks, [])
  assert.equal(openVenture(restored, 'hortifruti'), restored)
})

test('a loaded truck departs despite insufficient space, waits, then returns after expansion', () => {
  let game = { ...initialGame(), money: 200000, inventory: [{ cropId: 'wheat', value: 40, quantity: 50 }] }
  game = openVenture(game, 'hortifruti', 0)
  game = buyTruck(game, 'small', 0)
  game = loadTruck(game, 1, 'wheat', 25, 0)
  assert.equal(unitCount(game.inventory), 25)
  assert.equal(unitCount(game.trucks[0].cargo), 25)
  assert.equal(loadTruck(game, 1, 'wheat', 1, 0), game)
  game = dispatchTruck(game, 1, 'hortifruti', 0)
  game = simulateFreight(game, 30000)
  assert.equal(game.ventures[0].stock[0].quantity, 15)
  assert.equal(game.trucks[0].cargo[0].quantity, 10)
  assert.equal(game.trucks[0].status, 'unloading')
  game = expandVentureStock(game, 'hortifruti', 30000)
  game = simulateFreight(game, 30000)
  assert.equal(game.ventures[0].receivedUnits, 25)
  assert.equal(game.ventures[0].deliveries, 1)
  assert.equal(game.trucks[0].status, 'returning')
  game = simulateFreight(game, 60000)
  assert.equal(game.trucks[0].status, 'garage')
  assert.equal(unitCount(game.trucks[0].cargo), 0)
})

test('multiple trucks can be bought and empty garage trucks can be resold', () => {
  let game = { ...initialGame(), money: 250000 }
  for (const model of TRUCK_MODELS) game = buyTruck(game, model.id, 0)
  assert.deepEqual(game.trucks.map(truck => truckModelCapacity(truck)), [25, 50, 75, 100])
  const cash = game.money
  game = sellTruck(game, 1, 0)
  assert.equal(game.money, cash + 6000)
  assert.equal(game.trucks.length, 3)
})

test('waiting trucks share newly freed storage in arrival order', () => {
  let game = { ...initialGame(), money: 200000, inventory: [{ cropId: 'wheat', value: 40, quantity: 50 }] }
  game = openVenture(game, 'hortifruti', 0)
  game = buyTruck(buyTruck(game, 'small', 0), 'small', 0)
  for (const id of [1, 2]) {
    game = loadTruck(game, id, 'wheat', 25, 0)
    game = dispatchTruck(game, id, 'hortifruti', 0)
  }
  game = simulateFreight(game, 30000)
  assert.deepEqual(game.trucks.map(truck => unitCount(truck.cargo)), [10, 25])
  game = simulateFreight(expandVentureStock(game, 'hortifruti', 30000), 30000)
  assert.deepEqual(game.trucks.map(truck => unitCount(truck.cargo)), [0, 20])
  assert.equal(game.trucks[0].status, 'returning')
  assert.equal(game.trucks[1].status, 'unloading')
})

function truckModelCapacity(truck) {
  return TRUCK_MODELS.find(item => item.id === truck.modelId).capacity
}

test('loader follows priorities and reserves; driver chooses a destination and departs', () => {
  let game = { ...initialGame(), money: 200000, inventory: [
    { cropId: 'wheat', value: 40, quantity: 20 },
    { cropId: 'corn', value: 110, quantity: 10 },
  ] }
  game = openVenture(game, 'hortifruti', 0)
  game = buyTruck(game, 'small', 0)
  game = configureTruck(game, 1, { minDispatch: 8, rules: CROPS.map((crop, index) => ({
    cropId: crop.id, priority: crop.id === 'corn' ? 0 : crop.id === 'wheat' ? 1 : index,
    max: crop.id === 'corn' ? 4 : crop.id === 'wheat' ? 5 : 0,
    reserve: crop.id === 'corn' ? 3 : crop.id === 'wheat' ? 2 : 0,
  })).map(rule => ({ ...rule, priority: rule.cropId === 'corn' ? 0 : rule.cropId === 'wheat' ? 1 :
    rule.cropId === 'tomato' ? 2 : rule.cropId === 'strawberry' ? 3 : 4 })) }, 0)
  for (const role of ['loader', 'driver']) {
    game = hireWorker(game, role, 0)
    game = toggleWorkerTruck(game, game.workers.at(-1).id, 1, 0)
  }
  game = simulateFreight(game, 0)
  assert.equal(game.trucks[0].status, 'outbound')
  assert.equal(game.trucks[0].destinationId, 'hortifruti')
  assert.equal(unitCount(game.trucks[0].cargo), 9)
  assert.equal(game.trucks[0].cargo.find(item => item.cropId === 'corn').quantity, 4)
  assert.equal(game.trucks[0].cargo.find(item => item.cropId === 'wheat').quantity, 5)
  assert.equal(game.inventory.find(item => item.cropId === 'corn').quantity, 6)
})

test('manual unloading at the garage preserves batches, and an occupied truck cannot be sold', () => {
  let game = { ...initialGame(), money: 30000, inventory: [{ cropId: 'wheat', value: 53, quantity: 3 }] }
  game = buyTruck(game, 'small', 0)
  game = loadTruck(game, 1, 'wheat', 2, 0)
  assert.equal(sellTruck(game, 1, 0), game)
  game = emptyTruckAtGarage(game, 1, 0)
  assert.equal(game.inventory[0].quantity, 3)
  assert.equal(unitCount(game.trucks[0].cargo), 0)
})

test('offline automation ships only after a crop is harvested and completes the return', () => {
  let game = { ...initialGame(), money: 200000, simulatedAt: 0 }
  game = buyLand(game)
  game = openVenture(game, 'hortifruti', 0)
  game = buyTruck(game, 'small', 0)
  game = configureTruck(game, 1, { ...game.trucks[0].config, minDispatch: 1 }, 0)
  for (const role of ['irrigator', 'harvester', 'loader', 'driver']) {
    game = hireWorker(game, role, 0)
    const worker = game.workers.at(-1)
    game = ['loader', 'driver'].includes(role) ?
      toggleWorkerTruck(game, worker.id, 1, 0) : toggleWorkerPlot(game, worker.id, 1, 0)
  }
  game = plantCrop(game, 1, 'wheat', 0)
  game = simulateGame(game, 100000)
  assert.equal(game.ventures[0].receivedUnits, 1)
  assert.equal(game.ventures[0].deliveries, 1)
  assert.equal(game.trucks[0].status, 'garage')
  assert.equal(game.inventory.length, 0)
})
