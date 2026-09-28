import React, { useState } from 'react'
import { CROPS, ROLES, abilityChance, hirePrice, isUnlocked, upgradePrice } from './game.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)
const farmRoles = ['planter', 'irrigator', 'harvester']
const teams = {
  farm: { name: 'Fazenda', icon: '🌱', roles: farmRoles },
  freight: { name: 'Transporte', icon: '🚚', roles: ['loader', 'driver'] },
}
const roleDescription = {
  planter: 'Planta a semente escolhida quando o terreno está livre.',
  irrigator: 'Inicia a rega quando o plantio termina.',
  harvester: 'Colhe e guarda os produtos no estoque.',
  loader: 'Enche caminhões na garagem conforme o plano de cada veículo.',
  driver: 'Escolhe um destino com espaço livre e inicia a viagem quando a carga mínima é atingida.',
}

export default function StaffPanel({ game, onHire, onUpgrade, onTogglePlot, onToggleTruck, onCrop }) {
  const [group, setGroup] = useState('farm')
  const [selectedRole, setSelectedRole] = useState('planter')
  const roles = ROLES.filter(role => teams[group].roles.includes(role.id))
  const role = ROLES.find(item => item.id === selectedRole)
  const workers = game.workers.filter(worker => worker.role === selectedRole)
  function selectGroup(next) {
    setGroup(next)
    if (!teams[next].roles.includes(selectedRole)) setSelectedRole(teams[next].roles[0])
  }
  return <>
    <section className="staff-hero"><div><span className="eyebrow">ORGANIZE SUA EQUIPE</span><h1>Funcionários<span>.</span></h1><p>Contrate por profissão, escolha os locais de atuação e promova cada funcionário com dinheiro.</p></div><div className="staff-hero-icon" aria-hidden="true">🌿</div></section>
    <div className="staff-group-tabs" role="group" aria-label="Equipe">{Object.entries(teams).map(([id, item]) => <button key={id} type="button" className={group === id ? 'active' : ''} aria-pressed={group === id} onClick={() => selectGroup(id)}>{item.icon} {item.name} <span className="staff-tab-count">{game.workers.filter(worker => item.roles.includes(worker.role)).length}</span></button>)}</div>
    <div className="section-head staff-role-heading"><div><div className="eyebrow">EQUIPE DE {teams[group].name.toUpperCase()}</div><h2>Escolha uma profissão</h2><p>Cada profissão cuida de uma tarefa específica.</p></div></div>
    <div className="staff-role-picker" role="group" aria-label="Profissão">{roles.map(item => {
      const count = game.workers.filter(worker => worker.role === item.id).length
      return <button key={item.id} type="button" className={selectedRole === item.id ? 'active' : ''} aria-pressed={selectedRole === item.id} onClick={() => setSelectedRole(item.id)}><span className="staff-picker-icon">{item.icon}</span><span><strong>{item.name}</strong><small>{count} {count === 1 ? 'contratado' : 'contratados'}</small></span><span className="staff-picker-arrow" aria-hidden="true">→</span></button>
    })}</div>
    <section className="staff-role-detail" aria-label={`Profissão ${role.name}`}><div className="staff-role-intro"><span className="role-symbol">{role.icon}</span><div><span className="eyebrow">{teams[group].name.toUpperCase()} · {role.name.toUpperCase()}</span><h2>{role.name}</h2><p>{roleDescription[role.id]}</p></div></div><div className="staff-role-hire"><div><strong>✦ {role.ability}</strong><small>Pagamento único, sem salário ou XP. Cada nova contratação desta profissão custa mais.</small></div><button disabled={game.money < hirePrice(game, role.id)} onClick={() => onHire(role.id)}>Contratar {role.name.toLowerCase()} · {money(hirePrice(game, role.id))}</button></div></section>
    <div className="section-head staff-heading"><div><div className="eyebrow">EQUIPE CONTRATADA</div><h2>{role.name} <span className="count-pill">{workers.length}</span></h2><p>Cada nível permite atribuir mais um {group === 'farm' ? 'terreno' : 'caminhão'}. A promoção é paga com dinheiro.</p></div></div>
    {workers.length === 0 ? <div className="staff-empty"><span>{role.icon}</span><h3>Nenhum {role.name.toLowerCase()} contratado</h3><p>Contrate acima e escolha {group === 'farm' ? 'os terrenos' : 'os caminhões'} em que vai atuar.</p></div> :
      <div className="worker-grid">{workers.map(worker => {
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
              return <button key={target.id} type="button" className={selected ? 'assigned' : ''} aria-pressed={selected} disabled={!selected && (occupied || selectedIds.length >= worker.level)}
                onClick={() => farm ? onTogglePlot(worker.id, target.id) : onToggleTruck(worker.id, target.id)}
                title={occupied ? 'Outro funcionário desta profissão já foi designado' : ''}>
                {farm ? 'Terreno' : 'Caminhão'} {target.id} {selected ? '✓' : ''}</button>
            })}</div>}</div>
          <button className="upgrade-button" disabled={!Number.isFinite(price) || game.money < price} onClick={() => onUpgrade(worker.id)}>
            {Number.isFinite(price) ? `Promover para nível ${worker.level + 1} · ${money(price)}` : 'Nível máximo'} <span aria-hidden="true">→</span>
          </button>
        </article>
      })}</div>}
    <div className="tip-banner"><span aria-hidden="true">✦</span><p><strong>Autonomia</strong> Carregadores seguem o plano do caminhão; motoristas escolhem o destino e iniciam a viagem. Você também pode fazer tudo manualmente na aba Frete.</p></div>
  </>
}
