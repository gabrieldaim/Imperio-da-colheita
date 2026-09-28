import React, { useEffect, useState } from 'react'
import { CROPS } from './game.js'
import { TRUCK_MODELS, truckModel, unitCount } from './logistics.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)
const integer = amount => new Intl.NumberFormat('pt-BR').format(amount)
const remaining = (deadline, now) => {
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000))
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function TruckCard({ game, truck, now, onLoad, onEmpty, onDispatch, onSell, onConfigure }) {
  const model = truckModel(truck)
  const cargoCount = unitCount(truck.cargo)
  const [cropId, setCropId] = useState('wheat')
  const [quantity, setQuantity] = useState(1)
  const [destinationId, setDestinationId] = useState(game.ventures[0]?.id ?? '')
  const [editing, setEditing] = useState(false)
  const [config, setConfig] = useState(truck.config)
  useEffect(() => { setConfig(truck.config) }, [truck.id, truck.config])
  useEffect(() => { if (!game.ventures.some(item => item.id === destinationId)) setDestinationId(game.ventures[0]?.id ?? '') }, [game.ventures, destinationId])
  const inFarm = game.inventory.filter(item => item.cropId === cropId).reduce((sum, item) => sum + item.quantity, 0)
  const destination = game.ventures.find(item => item.id === truck.destinationId)
  const chosenDestination = game.ventures.find(item => item.id === destinationId)
  const destinationHasSpace = chosenDestination && (chosenDestination.capacity ?? 15) > unitCount(chosenDestination.stock)
  const status = truck.status === 'garage' ? 'Na garagem' : truck.status === 'outbound' ?
    `Indo para ${destination?.name ?? 'destino'} · ${remaining(truck.readyAt, now)}` :
    truck.status === 'unloading' ? 'Aguardando espaço para descarregar' :
      `Voltando à fazenda · ${remaining(truck.readyAt, now)}`
  const autoLoader = game.workers.some(item => item.role === 'loader' && item.trucks?.includes(truck.id))
  const autoDriver = game.workers.some(item => item.role === 'driver' && item.trucks?.includes(truck.id))
  const configValid = Number.isSafeInteger(Number(config.minDispatch)) && Number(config.minDispatch) >= 1 &&
    Number(config.minDispatch) <= model.capacity && config.rules.every(rule =>
      Number.isSafeInteger(Number(rule.max)) && Number(rule.max) >= 0 && Number(rule.max) <= model.capacity &&
      Number.isSafeInteger(Number(rule.reserve)) && Number(rule.reserve) >= 0)
  const setRule = (crop, key, value) => setConfig(previous => ({ ...previous,
    rules: previous.rules.map(rule => rule.cropId === crop ? { ...rule, [key]: Number(value) } : rule) }))
  const moveRule = (crop, step) => setConfig(previous => {
    const target = previous.rules.find(item => item.cropId === crop)
    const other = previous.rules.find(item => item.priority === target.priority + step)
    if (!other) return previous
    return { ...previous, rules: previous.rules.map(rule => rule.cropId === crop ?
      { ...rule, priority: other.priority } : rule.cropId === other.cropId ?
        { ...rule, priority: target.priority } : rule) }
  })
  return <article className="truck-card">
    <div className="truck-heading"><div className="truck-avatar">🚚</div><div><span className="eyebrow">CAMINHÃO #{String(truck.id).padStart(2, '0')}</span><h3>{model.name}</h3></div><strong>{integer(cargoCount)}/{model.capacity}</strong></div>
    <div className="truck-status">{status}</div>
    <div className="truck-cargo"><span>CARGA ATUAL</span>{cargoCount === 0 ? <p>Compartimento vazio</p> : truck.cargo.map((batch, index) => {
      const crop = CROPS.find(item => item.id === batch.cropId)
      return <div key={`${batch.cropId}-${batch.value}-${index}`}><span>{crop?.icon} {crop?.name}</span><strong>{batch.quantity} un.</strong></div>
    })}</div>
    {truck.status === 'garage' && <>
      <div className="truck-controls"><label>Produto<select value={cropId} onChange={event => setCropId(event.target.value)}>{CROPS.map(crop => <option key={crop.id} value={crop.id}>{crop.icon} {crop.name}</option>)}</select></label>
        <label>Quantidade<input type="number" min="1" max={Math.min(inFarm, model.capacity - cargoCount)} value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
        <button disabled={!inFarm || cargoCount >= model.capacity || Number(quantity) < 1 || Number(quantity) > Math.min(inFarm, model.capacity - cargoCount)} onClick={() => onLoad(truck.id, cropId, Number(quantity))}>Carregar</button></div>
      <div className="truck-destination"><label>Destino<select value={destinationId} onChange={event => setDestinationId(event.target.value)}>
        {game.ventures.length === 0 && <option value="">Abra um empreendimento primeiro</option>}
        {game.ventures.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label><button disabled={!cargoCount || !destinationHasSpace} onClick={() => onDispatch(truck.id, destinationId)}>Iniciar viagem →</button></div>
      {chosenDestination && !destinationHasSpace && <small className="truck-destination-warning">O destino está cheio. Aguarde espaço para iniciar a viagem.</small>}
      <div className="truck-minor-actions"><button disabled={!cargoCount} onClick={() => onEmpty(truck.id)}>Devolver carga à fazenda</button><button disabled={!!cargoCount} onClick={() => onSell(truck.id)}>Vender caminhão · {money(Math.floor(model.price / 2))}</button></div>
    </>}
    <div className="truck-automation"><span>{autoLoader ? '✓ Carregador designado' : '○ Sem carregador'}</span><span>{autoDriver ? '✓ Motorista designado' : '○ Condução manual'}</span></div>
    <button className="truck-config-toggle" onClick={() => setEditing(!editing)}>{editing ? 'Ocultar plano de carregamento' : 'Configurar carregamento'} {editing ? '⌃' : '⌄'}</button>
    {editing && <div className="truck-config">
      <p>O carregador respeita esta ordem, o máximo por produto e a reserva mínima na fazenda.</p>
      <label className="minimum-load">Carga mínima para saída automática <input type="number" min="1" max={model.capacity} value={config.minDispatch} onChange={event => setConfig(previous => ({ ...previous, minDispatch: Number(event.target.value) }))} /></label>
      <div className="truck-rule-head"><span>Prioridade / produto</span><span>Máx. na carga</span><span>Reserva na fazenda</span></div>
      {[...config.rules].sort((a, b) => a.priority - b.priority).map(rule => {
        const crop = CROPS.find(item => item.id === rule.cropId)
        return <div className="truck-rule" key={rule.cropId}>
          <div><button onClick={() => moveRule(rule.cropId, -1)} disabled={rule.priority === 0} aria-label={`Aumentar prioridade de ${crop.name}`}>↑</button><button onClick={() => moveRule(rule.cropId, 1)} disabled={rule.priority === CROPS.length - 1} aria-label={`Diminuir prioridade de ${crop.name}`}>↓</button><span>{crop.icon} {crop.name}</span></div>
          <input type="number" min="0" max={model.capacity} aria-label={`Máximo de ${crop.name}`} value={rule.max} onChange={event => setRule(rule.cropId, 'max', event.target.value)} />
          <input type="number" min="0" aria-label={`Reserva de ${crop.name}`} value={rule.reserve} onChange={event => setRule(rule.cropId, 'reserve', event.target.value)} />
        </div>
      })}
      <button className="save-config" disabled={!configValid} onClick={() => { onConfigure(truck.id, config); setEditing(false) }}>Salvar plano</button>
    </div>}
  </article>
}

export default function FreightPanel({ game, now, onBuy, onSell, onLoad, onEmpty, onDispatch, onConfigure }) {
  return <>
    <section className="freight-hero"><div><span className="eyebrow">DA FAZENDA PARA SEUS NEGÓCIOS</span><h1>Frete<span>.</span></h1><p>Monte sua frota, carregue os produtos e acompanhe cada entrega.</p></div><span aria-hidden="true">🚚</span></section>
    <div className="section-head"><div><div className="eyebrow">EXPANDA SUA FROTA</div><h2>Comprar caminhão</h2><p>Você pode possuir vários caminhões de qualquer modelo.</p></div></div>
    <div className="truck-shop">{TRUCK_MODELS.map(model => <article key={model.id}><div>🚛</div><h3>{model.name}</h3><p>{model.capacity} unidades · {model.travelSeconds}s por trajeto</p><strong>{money(model.price)}</strong><button disabled={game.money < model.price} onClick={() => onBuy(model.id)}>Comprar caminhão</button></article>)}</div>
    <div className="section-head"><div><div className="eyebrow">SEUS VEÍCULOS</div><h2>Minha frota <span className="count-pill">{game.trucks.length}</span></h2><p>O caminhão pode viajar mesmo se o destino não comportar toda a carga; o restante aguarda nele.</p></div></div>
    {game.trucks.length === 0 ? <div className="venture-empty"><div>🚛</div><h3>Sua garagem está vazia</h3><p>Escolha um modelo acima para começar a transportar produtos.</p></div> :
      <div className="truck-grid">{game.trucks.map(truck => <TruckCard key={truck.id} game={game} truck={truck} now={now}
        onLoad={onLoad} onEmpty={onEmpty} onDispatch={onDispatch} onSell={onSell} onConfigure={onConfigure} />)}</div>}
  </>
}
