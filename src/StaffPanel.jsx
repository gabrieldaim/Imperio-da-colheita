import React, { useState } from 'react'
import { CROPS, ROLES, abilityChance, hirePrice, isUnlocked, upgradePrice } from './game.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)
const farmRoles = ['planter', 'irrigator', 'harvester']
const roleDescription = {
  planter: 'Planta a semente escolhida quando o terreno está livre.',
  irrigator: 'Inicia a rega quando o plantio termina.',
  harvester: 'Colhe e guarda os produtos no estoque.',
  loader: 'Enche caminhões na garagem conforme o plano de cada veículo.',
  driver: 'Escolhe um destino aberto e inicia a viagem automaticamente.',
}

export default function StaffPanel({ game, onHire, onUpgrade, onTogglePlot, onToggleTruck, onCrop }) {
  const [group, setGroup] = useState('farm')
  const roles = ROLES.filter(role => group === 'farm' ? farmRoles.includes(role.id) : !farmRoles.includes(role.id))
  const workers = game.workers.filter(worker => roles.some(role => role.id === worker.role))
  return <>
    <section className="staff-hero"><div><span className="eyebrow">UMA EQUIPE PARA CRESCER</span><h1>Funcionários<span>.</span></h1><p>Organize suas equipes da fazenda e do frete em um só lugar.</p></div><div className="staff-hero-icon" aria-hidden="true">🌿</div></section>
    <div className="staff-group-tabs"><button className={group === 'farm' ? 'active' : ''} onClick={() => setGroup('farm')}>🌱 Fazenda</button><button className={group === 'freight' ? 'active' : ''} onClick={() => setGroup('freight')}>🚚 Frete</button></div>
    <div className="section-head"><div><div className="eyebrow">{group === 'farm' ? 'EQUIPE DA FAZENDA' : 'EQUIPE DE LOGÍSTICA'}</div><h2>Contratação</h2><p>Pagamento único, sem salário ou XP. A promoção é paga com dinheiro.</p></div></div>
    <div className="role-grid">{roles.map(role => <article className="role-card" key={role.id}>
      <div className="role-symbol">{role.icon}</div><h3>{role.name}</h3><p>{roleDescription[role.id]}</p>
      <div className="role-perk">✦ {role.ability}</div>
      <button disabled={game.money < hirePrice(game, role.id)} onClick={() => onHire(role.id)}>Contratar · {money(hirePrice(game, role.id))}</button>
    </article>)}</div>
    <div className="section-head staff-heading"><div><div className="eyebrow">EQUIPE CONTRATADA</div><h2>{group === 'farm' ? 'Equipe da fazenda' : 'Equipe do frete'} <span className="count-pill">{workers.length}</span></h2><p>Cada nível permite atuar em mais um {group === 'farm' ? 'terreno' : 'caminhão'}.</p></div></div>
    {workers.length === 0 ? <div className="staff-empty"><span>{group === 'farm' ? '👩‍🌾' : '🚛'}</span><h3>Nenhum funcionário nesta equipe</h3><p>Contrate uma profissão acima para começar a automatizar tarefas.</p></div> :
      <div className="worker-grid">{workers.map(worker => {
        const role = ROLES.find(item => item.id === worker.role)
        const farm = farmRoles.includes(worker.role)
        const selectedIds = farm ? worker.plots ?? [] : worker.trucks ?? []
        const targets = farm ? game.plots : game.trucks
        const price = upgradePrice(worker)
        return <article className="worker-card" key={worker.id}>
          <div className="worker-head"><span className="worker-avatar">{role.icon}</span><div><span className="eyebrow">FUNCIONÁRIO #{String(worker.id).padStart(2, '0')}</span><h3>{role.name}</h3></div><span className="worker-level">NV. {worker.level}</span></div>
          <div className="worker-info"><span><strong>{selectedIds.length}/{worker.level}</strong> {farm ? 'terrenos' : 'caminhões'}</span>
            {farm && <span><strong>{Math.round(abilityChance(worker.level) * 100)}%</strong> chance especial</span>}</div>
          <p className="worker-ability">✦ {role.ability}</p>
          {worker.role === 'planter' && <label className="worker-seed">Semente para plantar
            <select value={worker.cropId} onChange={event => onCrop(worker.id, event.target.value)}>
              {CROPS.map((crop, index) => <option key={crop.id} value={crop.id} disabled={!isUnlocked(game, index)}>{crop.icon} {crop.name}{!isUnlocked(game, index) ? ' · bloqueado' : ''}</option>)}
            </select></label>}
          <div className="worker-plots"><span>{farm ? 'TERRENOS DESIGNADOS' : 'CAMINHÕES DESIGNADOS'}</span>{targets.length === 0 ?
            <small>{farm ? 'Compre um terreno na fazenda.' : 'Compre um caminhão na aba Frete.'}</small> :
            <div>{targets.map(target => {
              const selected = selectedIds.includes(target.id)
              const occupied = game.workers.some(item => item.id !== worker.id && item.role === worker.role &&
                (farm ? item.plots?.includes(target.id) : item.trucks?.includes(target.id)))
              return <button key={target.id} className={selected ? 'assigned' : ''} disabled={!selected && (occupied || selectedIds.length >= worker.level)}
                onClick={() => farm ? onTogglePlot(worker.id, target.id) : onToggleTruck(worker.id, target.id)}
                title={occupied ? 'Outro funcionário desta profissão já foi designado' : ''}>
                {farm ? 'Terreno' : 'Caminhão'} {target.id} {selected ? '✓' : ''}</button>
            })}</div>}</div>
          <button className="upgrade-button" disabled={!Number.isFinite(price) || game.money < price} onClick={() => onUpgrade(worker.id)}>
            {Number.isFinite(price) ? `Promover para nível ${worker.level + 1} · ${money(price)}` : 'Nível máximo'} <span aria-hidden="true">→</span>
          </button>
        </article>
      })}</div>}
    <div className="tip-banner"><span aria-hidden="true">✦</span><p><strong>Autonomia</strong> Você pode realizar todas as tarefas manualmente. Funcionários executam apenas os trabalhos e destinos designados.</p></div>
  </>
}
