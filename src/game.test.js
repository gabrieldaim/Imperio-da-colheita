import test from 'node:test'
import assert from 'node:assert/strict'
import { CROPS, VENTURES, abilityChance, advancePlot, buyLand, chooseWorkerCrop, cropLevel, cropStats, hirePrice, hireWorker, initialGame, isUnlocked, landPrice, loadGame, openVenture, plantCrop, sellCrop, simulateWorkers, toggleWorkerPlot, upgradePrice, upgradeWorker } from './game.js'

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

test('a restaurant opens once, costs money and starts with its own empty stock', () => {
  let game = { ...initialGame(), money: 6000, inventory: [{ cropId: 'wheat', value: 40, quantity: 3 }] }
  game = openVenture(game, 'restaurant', 100)
  assert.equal(game.money, 6000 - VENTURES[0].openingCost)
  assert.deepEqual(game.ventures[0].stock, [])
  assert.equal(game.inventory[0].quantity, 3)
  assert.equal(openVenture(game, 'restaurant', 200), game)
  const poor = { ...initialGame(), money: 4999 }
  assert.equal(openVenture(poor, 'restaurant'), poor)
})
