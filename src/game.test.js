import test from 'node:test'
import assert from 'node:assert/strict'
import { CROPS, advancePlot, buyLand, cropLevel, cropStats, initialGame, isUnlocked, landPrice, loadGame, plantCrop, sellCrop } from './game.js'

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
  assert.equal(game.plots[0].crop.readyAt, deadline + 1000000 + 18000)
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
