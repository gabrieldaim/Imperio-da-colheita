import React from 'react'
import { CROPS, ROLES, abilityChance, hirePrice, isUnlocked, upgradePrice } from './game.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)

export default function StaffPanel({ game, onHire, onUpgrade, onTogglePlot, onCrop }) {
  return <>
    <section className="staff-hero"><div><span className="eyebrow">UMA EQUIPE PARA CRESCER</span><h1>Funcionários<span>.</span></h1><p>Distribua tarefas entre os terrenos. Sua equipe trabalha mesmo enquanto você estiver fora.</p></div><div className="staff-hero-icon" aria-hidden="true">🌿</div></section>
    <div className="section-head"><div><div className="eyebrow">MONTE SUA EQUIPE</div><h2>Contratação</h2><p>Pagamento único. Sem salário, XP ou custos por tarefa.</p></div></div>
    <div className="role-grid">{ROLES.map(role => <article className="role-card" key={role.id}>
      <div className="role-symbol">{role.icon}</div><h3>{role.name}</h3>
      <p>{role.id === 'planter' ? 'Planta a semente escolhida quando o terreno está livre.' : role.id === 'irrigator' ? 'Inicia a rega quando o plantio termina.' : 'Colhe e guarda os produtos no estoque.'}</p>
      <div className="role-perk">✦ {role.ability}</div>
      <button disabled={game.money < hirePrice(game, role.id)} onClick={() => onHire(role.id)}>Contratar · {money(hirePrice(game, role.id))}</button>
    </article>)}</div>
    <div className="section-head staff-heading"><div><div className="eyebrow">EQUIPE CONTRATADA</div><h2>Seus funcionários <span className="count-pill">{game.workers.length}</span></h2><p>Escolha os terrenos de cada um. Cada nível amplia a capacidade em um terreno.</p></div></div>
    {game.workers.length === 0 ? <div className="staff-empty"><span>👩‍🌾</span><h3>Seu primeiro funcionário está esperando</h3><p>Contrate uma profissão acima para automatizar uma etapa da fazenda.</p></div> :
      <div className="worker-grid">{game.workers.map(worker => {
        const role = ROLES.find(item => item.id === worker.role)
        const price = upgradePrice(worker)
        return <article className="worker-card" key={worker.id}>
          <div className="worker-head"><span className="worker-avatar">{role.icon}</span><div><span className="eyebrow">FUNCIONÁRIO #{String(worker.id).padStart(2, '0')}</span><h3>{role.name}</h3></div><span className="worker-level">NV. {worker.level}</span></div>
          <div className="worker-info"><span><strong>{worker.plots.length}/{worker.level}</strong> terrenos</span><span><strong>{Math.round(abilityChance(worker.level) * 100)}%</strong> chance especial</span></div>
          <p className="worker-ability">✦ {role.ability}</p>
          {worker.role === 'planter' && <label className="worker-seed">Semente para plantar
            <select value={worker.cropId} onChange={event => onCrop(worker.id, event.target.value)}>
              {CROPS.map((crop, index) => <option key={crop.id} value={crop.id} disabled={!isUnlocked(game, index)}>{crop.icon} {crop.name}{!isUnlocked(game, index) ? ' · bloqueado' : ''}</option>)}
            </select>
          </label>}
          <div className="worker-plots"><span>TERRENOS DESIGNADOS</span>{game.plots.length === 0 ? <small>Compre um terreno na fazenda para começar.</small> :
            <div>{game.plots.map(plot => {
              const selected = worker.plots.includes(plot.id)
              const occupied = game.workers.some(item => item.id !== worker.id && item.role === worker.role && item.plots.includes(plot.id))
              return <button key={plot.id} className={selected ? 'assigned' : ''} disabled={!selected && (occupied || worker.plots.length >= worker.level)}
                onClick={() => onTogglePlot(worker.id, plot.id)} title={occupied ? 'Outro funcionário desta profissão atua neste terreno' : ''}>Terreno {plot.id} {selected ? '✓' : ''}</button>
            })}</div>}</div>
          <button className="upgrade-button" disabled={!Number.isFinite(price) || game.money < price} onClick={() => onUpgrade(worker.id)}>
            {Number.isFinite(price) ? `Promover para nível ${worker.level + 1} · ${money(price)}` : 'Nível máximo'} <span aria-hidden="true">→</span>
          </button>
        </article>
      })}</div>}
    <div className="tip-banner"><span aria-hidden="true">✦</span><p><strong>Como funciona</strong> Plantadores precisam de dinheiro para sementes, exceto quando a habilidade especial ativa. Funcionários não vendem produtos: você decide as vendas no estoque. A promoção é paga, sem XP.</p></div>
  </>
}
