import React, { useEffect, useMemo, useState } from 'react'
import StaffPanel from './StaffPanel.jsx'
import VenturesPanel from './VenturesPanel.jsx'
import {
  CROPS, MAX_PLOTS, PHASES, STORAGE_KEY, VENTURES, advancePlot, buyLand, chooseWorkerCrop, cropLevel,
  cropStats, initialGame, isUnlocked, landPrice, loadGame, nextLevelXp,
  hirePrice, hireWorker, openVenture, plantCrop, sellCrop, simulateWorkers, toggleWorkerPlot,
  upgradePrice, upgradeWorker, xpAtLevel,
} from './game.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)
const integer = amount => new Intl.NumberFormat('pt-BR').format(amount)

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds))
  if (value < 60) return `${value}s`
  const minutes = Math.floor(value / 60)
  return `${minutes}m ${String(value % 60).padStart(2, '0')}s`
}

function CropArt({ crop, large = false }) {
  return <span className={`crop-art ${large ? 'crop-art-large' : ''}`} style={{ '--crop-color': crop.color }} aria-hidden="true">{crop.icon}</span>
}

function Icon({ name, size = 20 }) {
  const paths = {
    farm: <><path d="M3 20h18M6 20V9l6-5 6 5v11M9 20v-6h6v6M3 10l9-7 9 7" /></>,
    store: <><path d="M3 10h18l-1.5-6h-15L3 10Zm1 0v10h16V10M8 20v-6h8v6M3 10c0 3 4 3 4 0 0 3 4 3 4 0 0 3 4 3 4 0 0 3 4 3 4 0" /></>,
    staff: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0-1-6M17 14a5 5 0 0 1 4 5v1" /></>,
    venture: <><path d="M3 10h18l-1-6H4l-1 6Zm2 0v10h14V10M9 20v-6h6v6M3 10c0 3 4 3 4 0 0 3 4 3 4 0 0 3 4 3 4 0" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    sparkle: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 17l.6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Plot({ plot, now, onPlant, onAdvance }) {
  const planted = plot.crop
  if (!planted) return (
    <article className="plot plot-empty">
      <div className="plot-top"><span className="plot-number">TERRENO {String(plot.id).padStart(2, '0')}</span><span className="plot-status vacant">● Livre</span></div>
      <div className="soil-scene empty-soil"><div className="soil-lines" /><span className="empty-sprout">✳</span></div>
      <div className="plot-bottom"><div><h3>Terra pronta</h3><p>Um novo cultivo começa aqui</p></div><button className="round-action" onClick={() => onPlant(plot.id)} aria-label={`Escolher semente para o terreno ${plot.id}`}><Icon name="plus" /></button></div>
    </article>
  )
  const crop = CROPS.find(item => item.id === planted.cropId)
  const phaseIndex = PHASES.indexOf(planted.phase)
  const remaining = Math.max(0, (planted.readyAt - now) / 1000)
  const ready = remaining === 0
  const phaseName = ['Plantando', 'Regando', 'Colhendo'][phaseIndex]
  const nextAction = ['Regar', 'Colher', null][phaseIndex]
  const visual = ['🌱', '🌿', crop.icon][phaseIndex]
  const progress = ready ? 100 : Math.min(100, Math.max(0, 100 * (1 - remaining / (planted.phaseSeconds ?? planted.seconds))))
  return (
    <article className={`plot plot-active ${ready ? 'plot-ready' : ''}`}>
      <div className="plot-top"><span className="plot-number">TERRENO {String(plot.id).padStart(2, '0')}</span><span className={`plot-status ${ready ? 'ready' : 'working'}`}>● {ready ? (nextAction ? 'Ação pronta' : 'Colheita pronta') : 'Em cultivo'}</span></div>
      <div className="soil-scene"><div className="soil-lines" /><span className="growing-plant">{visual}</span><span className="scene-sparkle">✦</span></div>
      <div className="plot-bottom"><div><h3>{crop.name} <small>NV. {planted.level}</small></h3><p>{ready ? (nextAction ? `Pronto para ${nextAction.toLowerCase()}` : 'Produto pronto para o estoque') : `${phaseName} · ${formatTime(remaining)} restantes`}</p></div><span className="plot-estimate">{money(planted.value)}</span></div>
      <div className="phase-track" aria-label={`Etapa ${phaseIndex + 1} de 3: ${phaseName}`}>
        {['Plantar', 'Regar', 'Colher'].map((label, index) => <div key={label} className={`phase ${index < phaseIndex ? 'done' : index === phaseIndex ? 'current' : ''}`}><span>{index < phaseIndex ? '✓' : `0${index + 1}`}</span>{label}</div>)}
      </div>
      {ready ? <button className="plot-button" onClick={() => onAdvance(plot.id)}>{nextAction ? `${nextAction} agora` : 'Guardar no estoque'} <Icon name="arrow" size={18} /></button> : <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}
    </article>
  )
}

function SeedModal({ game, plotId, onClose, onSelect }) {
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="seed-modal" role="dialog" aria-modal="true" aria-labelledby="seed-title">
      <div className="modal-heading"><div><span className="eyebrow">TERRENO {String(plotId).padStart(2, '0')} · CATÁLOGO DE SEMENTES</span><h2 id="seed-title">O que vamos plantar?</h2><p>Escolha uma cultura para começar o ciclo.</p></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></div>
      <div className="seed-list">{CROPS.map((crop, index) => {
        const unlocked = isUnlocked(game, index)
        const level = cropLevel(game, crop.id)
        const stats = cropStats(crop, level)
        const xp = game.progress[crop.id]?.xp ?? 0
        const start = xpAtLevel(level)
        const end = nextLevelXp(level)
        const canAfford = game.money >= crop.cost
        return <article className={`seed-option ${unlocked ? '' : 'seed-locked'}`} key={crop.id}>
          <CropArt crop={crop} /><div className="seed-details"><div className="seed-name"><h3>{crop.name}</h3>{unlocked && <span>NV. {level}</span>}</div>
          {unlocked ? <><p><strong>{money(stats.value)}</strong> estimados · <strong>{formatTime(stats.seconds)}</strong> por etapa</p><div className="seed-xp"><span style={{ width: `${Math.max(0, Math.min(100, (xp - start) / (end - start) * 100))}%` }} /></div><small>{xp - start}/{end - start} XP para o próximo nível · custo {money(crop.cost)}</small></> : <p className="unlock-copy"><Icon name="lock" size={14} /> Libera com {CROPS[index - 1].name} no nível 5</p>}</div>
          <button className="seed-select" disabled={!unlocked || !canAfford} onClick={() => onSelect(plotId, crop.id)}>{!unlocked ? 'Bloqueado' : !canAfford ? 'Sem saldo' : 'Plantar'}</button>
        </article>
      })}</div>
      <p className="modal-footnote">Cada etapa leva o tempo indicado. Você decide quando começar a próxima.</p>
    </div>
  </div>
}

function App() {
  const [game, setGame] = useState(() => simulateWorkers(loadGame(window.localStorage), Date.now()))
  const [tab, setTab] = useState('farm')
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [now, setNow] = useState(Date.now)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => {
      const time = Date.now()
      setNow(time)
      setGame(previous => simulateWorkers(previous, time))
    }, 500)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game)) } catch { /* Storage may be blocked in private mode. */ } }, [game])
  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const stockCount = game.inventory.reduce((sum, item) => sum + item.quantity, 0)
  const stockValue = game.inventory.reduce((sum, item) => sum + Math.floor(item.value * 0.5) * item.quantity, 0)
  const activeCount = game.plots.filter(item => item.crop).length
  const groupedStock = useMemo(() => CROPS.map(crop => ({ crop, batches: game.inventory.filter(item => item.cropId === crop.id) })).filter(item => item.batches.length > 0), [game.inventory])

  function handleBuyLand() {
    if (game.plots.length >= MAX_PLOTS) return
    if (game.money < landPrice(game.plots.length)) { setNotice('Saldo insuficiente para comprar este terreno.'); return }
    setGame(previous => { const next = buyLand(previous); return next === previous ? previous : { ...next, simulatedAt: Date.now() } })
    setNotice('Novo terreno adquirido!')
  }
  function handlePlant(plotId, cropId) {
    const crop = CROPS.find(item => item.id === cropId)
    if (game.money < crop.cost) return
    setGame(previous => { const time = Date.now(); const next = plantCrop(previous, plotId, cropId, time); return next === previous ? previous : { ...next, simulatedAt: time } })
    setSelectedPlot(null)
    setNotice(`${crop.name} plantado. O cultivo começou!`)
  }
  function handleAdvance(plotId) {
    const plot = game.plots.find(item => item.id === plotId)
    if (!plot?.crop || Date.now() < plot.crop.readyAt) return
    const finished = plot.crop.phase === 'harvesting'
    const crop = CROPS.find(item => item.id === plot.crop.cropId)
    const beforeLevel = cropLevel(game, crop.id)
    setGame(previous => { const time = Date.now(); const next = advancePlot(previous, plotId, time); return next === previous ? previous : { ...next, simulatedAt: time } })
    if (finished) {
      const afterLevel = cropLevel({ ...game, progress: { ...game.progress, [crop.id]: { xp: game.progress[crop.id].xp + 1 } } }, crop.id)
      setNotice(afterLevel > beforeLevel ? `${crop.name} alcançou o nível ${afterLevel}!` : `${crop.name} guardado no estoque. +1 XP`)
    } else setNotice(plot.crop.phase === 'planting' ? 'Hora de regar. A próxima etapa começou!' : 'Hora de colher. A última etapa começou!')
  }
  function handleSell(cropId, amount) {
    setGame(previous => { const next = sellCrop(previous, cropId, amount); return next === previous ? previous : { ...next, simulatedAt: Date.now() } })
    setNotice(`${amount} ${amount === 1 ? 'unidade vendida' : 'unidades vendidas'} aos comerciantes próximos.`)
  }
  function handleHire(roleId) {
    if (game.money < hirePrice(game, roleId)) return
    setGame(previous => hireWorker(previous, roleId))
    setNotice('Funcionário contratado! Selecione os terrenos em que ele vai atuar.')
  }
  function handleUpgrade(workerId) {
    const worker = game.workers.find(item => item.id === workerId)
    if (!worker || game.money < upgradePrice(worker)) return
    setGame(previous => upgradeWorker(previous, workerId))
    setNotice('Funcionário promovido! Mais um terreno e maior chance especial.')
  }
  function handleOpenVenture(type) {
    const offer = VENTURES.find(item => item.id === type)
    if (!offer || game.money < offer.openingCost) return
    setGame(previous => openVenture(previous, type))
    setNotice('Hortifrúti aberto! O estoque próprio já pode ser consultado.')
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol">✳</div><div><strong>IMPÉRIO</strong><span>DA COLHEITA</span></div></div>
      <div className="side-label">MENU PRINCIPAL</div>
      <nav className="main-nav" aria-label="Navegação principal">
        <button className={tab === 'farm' ? 'selected' : ''} onClick={() => setTab('farm')}><Icon name="farm" /> Fazenda <span className="nav-arrow">›</span></button>
        <button className={tab === 'inventory' ? 'selected' : ''} onClick={() => setTab('inventory')}><Icon name="store" /> Estoque da fazenda <span className="nav-count">{stockCount}</span></button>
        <button className={tab === 'staff' ? 'selected' : ''} onClick={() => setTab('staff')}><Icon name="staff" /> Funcionários <span className="nav-count">{game.workers.length}</span></button>
        <button className={tab === 'ventures' ? 'selected' : ''} onClick={() => setTab('ventures')}><Icon name="venture" /> Empreendimentos <span className="nav-count">{game.ventures.length}</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="season-icon">☀</div><div><strong>Um império começa</strong><span>com uma semente.</span></div></div>
      <span className="version-label">VERSÃO 0.3 · FAZENDA</span>
    </aside>

    <main className="main-content">
      <header className="topbar"><span className="breadcrumb">SEU IMPÉRIO <span>/</span> {tab === 'farm' ? 'FAZENDA' : tab === 'staff' ? 'FUNCIONÁRIOS' : tab === 'ventures' ? 'EMPREENDIMENTOS' : 'ESTOQUE DA FAZENDA'}</span><div className="topbar-right"><span className="saved-indicator"><span /> Salvo no navegador</span><div className="balance"><span>SALDO DISPONÍVEL</span><strong>{money(game.money)}</strong></div></div></header>
      <div className="content-wrap">
        {tab === 'farm' ? <>
          <section className="hero"><div className="hero-copy"><div className="hero-kicker"><span>✦</span> O INÍCIO DA SUA JORNADA</div><h1>Sua terra.<br /><em>Seu império.</em></h1><p>Plante com cuidado, evolua suas culturas e transforme cada colheita em uma nova oportunidade.</p><div className="hero-meta"><span>✳ &nbsp; {game.plots.length} {game.plots.length === 1 ? 'terreno' : 'terrenos'}</span><span>◷ &nbsp; {activeCount} em cultivo</span></div></div><div className="hero-illustration" aria-hidden="true"><div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="farmhouse"><span>▰</span></div><div className="field-row field-row-one">🌱　🌱　🌱</div><div className="field-row field-row-two">🌾　🌾　🌾　🌾</div></div></section>
          <div className="section-head"><div><div className="eyebrow">ONDE TUDO ACONTECE</div><h2>Seus terrenos <span className="count-pill">{game.plots.length}</span></h2><p>Cada terreno é uma nova chance de crescer.</p></div>{game.plots.length > 0 && game.plots.length < MAX_PLOTS && <button className="buy-button" onClick={handleBuyLand}><Icon name="plus" size={17} /> Comprar terreno <span>{money(landPrice(game.plots.length))}</span></button>}</div>
          {game.plots.length === 0 ? <div className="first-land"><div className="first-land-art">🌱</div><span className="eyebrow">PRIMEIRO PASSO</span><h3>Todo império começa pela terra.</h3><p>Você tem {money(game.money)} para começar. Adquira seu primeiro terreno e plante sua primeira semente.</p><button className="primary-button" onClick={handleBuyLand}>Comprar primeiro terreno · {money(landPrice(0))} <Icon name="arrow" size={18} /></button></div> : <div className="plot-grid">{game.plots.map(plot => <Plot key={plot.id} plot={plot} now={now} onPlant={setSelectedPlot} onAdvance={handleAdvance} />)}{game.plots.length < MAX_PLOTS && <button className="add-plot" onClick={handleBuyLand}><span className="add-plot-icon"><Icon name="plus" size={26} /></span><strong>Expandir a fazenda</strong><span>Próximo terreno por {money(landPrice(game.plots.length))}</span></button>}</div>}
          <div className="tip-banner"><Icon name="sparkle" size={22} /><p><strong>Dica do campo</strong> Cada colheita dá 1 XP à semente. No nível 5, você libera uma nova cultura. Culturas de nível maior rendem mais e levam menos tempo.</p></div>
        </> : tab === 'staff' ? <StaffPanel game={game} onHire={handleHire} onUpgrade={handleUpgrade}
          onTogglePlot={(workerId, plotId) => setGame(previous => toggleWorkerPlot(previous, workerId, plotId))}
          onCrop={(workerId, cropId) => setGame(previous => chooseWorkerCrop(previous, workerId, cropId))} /> : tab === 'ventures' ?
          <VenturesPanel game={game} onOpen={handleOpenVenture} /> : <>
          <section className="inventory-hero"><div><span className="eyebrow">O FRUTO DO SEU TRABALHO</span><h1>Estoque da fazenda<span>.</span></h1><p>Seus produtos ficam aqui até você decidir o momento de vender.</p></div><div className="inventory-hero-mark" aria-hidden="true">✳</div></section>
          <div className="stat-grid"><div className="stat-card"><span>PRODUTOS EM ESTOQUE</span><strong>{integer(stockCount)}</strong><small>unidades disponíveis</small></div><div className="stat-card"><span>VENDA IMEDIATA</span><strong>{money(stockValue)}</strong><small>valor disponível agora</small></div><div className="stat-card"><span>COLHEITAS REALIZADAS</span><strong>{integer(game.totalHarvests)}</strong><small>desde o início da jornada</small></div></div>
          <div className="section-head stock-title"><div><div className="eyebrow">SEUS PRODUTOS</div><h2>Prontos para vender <span className="count-pill">{groupedStock.length}</span></h2><p>Comerciantes próximos compram na hora por 50% do valor estimado.</p></div></div>
          {groupedStock.length === 0 ? <div className="empty-inventory"><div>🧺</div><h3>Seu estoque está vazio</h3><p>Plante, regue e colha para trazer seus primeiros produtos.</p><button className="primary-button" onClick={() => setTab('farm')}>Ir para a fazenda <Icon name="arrow" size={18} /></button></div> : <div className="stock-list">{groupedStock.map(({ crop, batches }) => {
            const quantity = batches.reduce((sum, batch) => sum + batch.quantity, 0)
            const payout = batches.reduce((sum, batch) => sum + Math.floor(batch.value * 0.5) * batch.quantity, 0)
            return <article className="stock-row" key={crop.id}><CropArt crop={crop} large /><div className="stock-name"><h3>{crop.name}</h3><p>{quantity} {quantity === 1 ? 'unidade' : 'unidades'} em estoque</p></div><div className="stock-price"><span>RECEBIMENTO IMEDIATO</span><strong>{money(payout)}</strong><small>{batches.length > 1 ? 'Valores preservados por colheita' : `${money(Math.floor(batches[0].value * 0.5))} por unidade`}</small></div><div className="stock-actions"><button onClick={() => handleSell(crop.id, 1)}>Vender 1</button><button className="sell-all" onClick={() => handleSell(crop.id, quantity)}>Vender tudo <Icon name="arrow" size={17} /></button></div></article>
          })}</div>}
          <div className="tip-banner inventory-tip"><Icon name="store" size={22} /><p><strong>Comércio local</strong> A venda é instantânea e paga metade do valor estimado da colheita. Outras formas de negociar chegarão nas próximas etapas do jogo.</p></div>
        </>}
      </div>
    </main>
    {selectedPlot !== null && <SeedModal game={game} plotId={selectedPlot} onClose={() => setSelectedPlot(null)} onSelect={handlePlant} />}
    {notice && <div className="toast" role="status">✦ &nbsp; {notice}</div>}
  </div>
}

export default App
