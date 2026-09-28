import React, { useState } from 'react'
import { CROPS, VENTURES, stockUpgradePrice } from './game.js'
import { SALES_UPGRADES, salesStats, salesUpgradePrice } from './sales.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)
const integer = amount => new Intl.NumberFormat('pt-BR').format(amount)
const amount = stock => stock.reduce((sum, item) => sum + item.quantity, 0)

export default function VenturesPanel({ game, now, onOpen, onExpand, onUpgrade }) {
  const [selected, setSelected] = useState(null)
  const [detailTab, setDetailTab] = useState('home')
  const offer = VENTURES[0]
  const venture = game.ventures.find(item => item.id === selected)
  const opened = game.ventures.find(item => item.type === offer.id)

  if (venture) {
    const stock = venture.stock ?? []
    const used = amount(stock)
    const waiting = (game.trucks ?? []).filter(truck => truck.status === 'unloading' && truck.destinationId === venture.id)
    const stats = salesStats(venture)
    const totals = venture.salesTotals ?? { visits: 0, buyers: 0, missed: 0, units: 0, revenue: 0 }
    const secondsLeft = Math.max(0, Math.ceil(((venture.nextSalesAt ?? now) - now) / 1000))
    return <>
      <button className="venture-back" onClick={() => setSelected(null)}>← Voltar aos empreendimentos</button>
      <div className="venture-detail-head"><span aria-hidden="true">{offer.icon}</span><div><div className="eyebrow">EMPREENDIMENTO ABERTO</div><h1>{venture.name}</h1></div></div>
      <nav className="venture-tabs" aria-label="Áreas do hortifrúti">
        {[['home', 'Principal'], ['stock', 'Estoque'], ['reports', 'Relatórios']].map(([id, label]) =>
          <button key={id} className={detailTab === id ? 'active' : ''} onClick={() => setDetailTab(id)}>{label}</button>)}
      </nav>
      {detailTab === 'home' && <>
        <div className="venture-stat-grid">
          <div><span>PRÓXIMO CICLO DE VENDAS</span><strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</strong><small>automático a cada 2 minutos</small></div>
          <div><span>ESTOQUE OCUPADO</span><strong>{integer(used)}/{integer(venture.capacity ?? 15)}</strong><small>unidades</small></div>
          <div><span>FATURAMENTO ACUMULADO</span><strong>{money(totals.revenue)}</strong><small>{integer(venture.salesCycles ?? 0)} ciclos concluídos</small></div>
        </div>
        <div className="venture-info-card"><h2>Loja em funcionamento</h2><p>A cada ciclo, clientes visitam o hortifrúti. Cada unidade vendida libera um espaço para os caminhões aguardando descarregarem. {waiting.length} {waiting.length === 1 ? 'caminhão aguardando' : 'caminhões aguardando'} no momento.</p><button onClick={() => setDetailTab('reports')}>Ver relatório de vendas →</button></div>
        <div className="section-head"><div><div className="eyebrow">INVISTA NO NEGÓCIO</div><h2>Melhorias da loja</h2><p>As melhorias são permanentes e passam a valer no próximo ciclo.</p></div></div>
        <div className="venture-upgrades">{SALES_UPGRADES.map(upgrade => {
          const level = venture.salesUpgrades?.[upgrade.id] ?? 0
          const price = salesUpgradePrice(venture, upgrade.id)
          const effect = upgrade.id === 'marketing' ? `${stats.minVisits} a ${stats.maxVisits} visitas por ciclo` : upgrade.id === 'conversion' ? `${stats.conversion}% de chance de compra` : `${stats.additional}% de chance de +1 unidade`
          return <article key={upgrade.id}><div className="venture-upgrade-title"><span>{upgrade.icon}</span><div><h3>{upgrade.name}</h3><small>Nível {level} / {upgrade.maxLevel}</small></div></div><p>{effect}</p><small>{upgrade.id === 'marketing' ? `Próximo nível: ${Math.max(0, level)} a ${stats.maxVisits + 1} visitas` : upgrade.id === 'conversion' ? 'Próximo nível: +5 pontos percentuais' : 'Próximo nível: +10 pontos percentuais'}</small><button disabled={!Number.isFinite(price) || game.money < price} onClick={() => onUpgrade(venture.id, upgrade.id)}>{Number.isFinite(price) ? `Melhorar · ${money(price)}` : 'Nível máximo'}</button></article>
        })}</div>
      </>}
      {detailTab === 'stock' && <>
        <div className="section-head"><div><div className="eyebrow">ARMAZENAMENTO</div><h2>Estoque do hortifrúti</h2><p>{integer(used)} de {integer(venture.capacity ?? 15)} espaços ocupados. Cada produto usa um espaço.</p></div></div>
        <div className="venture-storage-bar"><span style={{ width: `${Math.min(100, 100 * used / (venture.capacity ?? 15))}%` }} /></div>
        <div className="venture-expand"><div><strong>Ampliar estoque em 15 espaços</strong><p>A primeira ampliação custa {money(stockUpgradePrice(venture))}; as próximas ficam mais caras.</p></div>
          <button disabled={game.money < stockUpgradePrice(venture)} onClick={() => onExpand(venture.id)}>Ampliar · {money(stockUpgradePrice(venture))}</button></div>
        {stock.length === 0 ? <div className="venture-empty"><div aria-hidden="true">📦</div><h3>O estoque ainda está vazio</h3><p>Carregue um caminhão na fazenda e envie os produtos pela aba Frete.</p></div> :
          <div className="venture-stock-list">{stock.map((item, index) => {
            const crop = CROPS.find(candidate => candidate.id === item.cropId)
            return <div className="venture-stock-row" key={`${item.cropId}-${item.value}-${index}`}><span aria-hidden="true">{crop?.icon ?? '📦'}</span><strong>{crop?.name ?? item.cropId}</strong><span>{integer(item.quantity)} {item.quantity === 1 ? 'unidade' : 'unidades'}</span></div>
          })}</div>}
        {waiting.length > 0 && <p className="venture-waiting">{waiting.length} {waiting.length === 1 ? 'caminhão aguarda' : 'caminhões aguardam'} espaço. Cada vaga liberada recebe automaticamente uma unidade.</p>}
      </>}
      {detailTab === 'reports' && <>
        <div className="section-head"><div><div className="eyebrow">HISTÓRICO DO NEGÓCIO</div><h2>Relatórios de vendas</h2><p>Totais desde a abertura e detalhes dos últimos 20 ciclos.</p></div></div>
        <div className="venture-stat-grid">
          <div><span>VISITAS / COMPRADORES</span><strong>{integer(totals.visits)} / {integer(totals.buyers)}</strong><small>{integer(totals.missed)} vendas perdidas por falta de estoque</small></div>
          <div><span>UNIDADES VENDIDAS</span><strong>{integer(totals.units)}</strong><small>{integer(venture.receivedUnits ?? 0)} recebidas via frete</small></div>
          <div><span>FATURAMENTO TOTAL</span><strong>{money(totals.revenue)}</strong><small>{integer(venture.salesCycles ?? 0)} ciclos concluídos</small></div>
        </div>
        <div className="section-head"><div><div className="eyebrow">CICLOS RECENTES</div><h2>Histórico</h2></div></div>
        {(venture.salesReports ?? []).length === 0 ? <div className="venture-empty"><div>📊</div><h3>Aguardando o primeiro ciclo</h3><p>As vendas serão registradas automaticamente em até 2 minutos.</p></div> :
          <div className="venture-reports">{venture.salesReports.map(report => <article key={report.cycle}><div><strong>Ciclo #{report.cycle}</strong><small>{new Date(report.at).toLocaleString('pt-BR')}</small></div><p>{report.visits} visitas · {report.buyers} compradores · {report.missed} sem produto · {report.units} unidades</p><strong>{money(report.revenue)}</strong><small>{Object.entries(report.products).map(([id, result]) => `${CROPS.find(crop => crop.id === id)?.name ?? id}: ${result.quantity} un. (${money(result.revenue)})`).join(' · ') || 'Nenhum produto vendido'}</small></article>)}</div>}
      </>}
    </>
  }

  return <>
    <section className="ventures-hero"><div><span className="eyebrow">A PRÓXIMA CAMADA DO SEU IMPÉRIO</span><h1>Empreendimentos<span>.</span></h1><p>Seus negócios ficam aqui. Abra um hortifrúti e acompanhe seus estoques e relatórios.</p></div><div className="ventures-hero-icon" aria-hidden="true">🥬</div></section>
    <div className="section-head"><div><div className="eyebrow">SEUS NEGÓCIOS</div><h2>Meus empreendimentos <span className="count-pill">{game.ventures.length}</span></h2><p>Selecione um negócio para abrir sua área de gestão.</p></div></div>
    {opened ? <button className="venture-list-card" onClick={() => { setSelected(opened.id); setDetailTab('home') }}>
      <span className="venture-list-icon">{offer.icon}</span><span><strong>{opened.name}</strong><small>{integer(amount(opened.stock ?? []))}/{integer(opened.capacity ?? 15)} unidades no estoque · Aberto</small></span><span className="venture-list-arrow">→</span>
    </button> : <article className="venture-offer">
      <div className="venture-offer-icon" aria-hidden="true">{offer.icon}</div>
      <div className="venture-offer-copy"><span className="eyebrow">DISPONÍVEL PARA ABERTURA</span><h3>{offer.name}</h3><p>Seu primeiro negócio com estoque de 15 unidades e ciclos automáticos de vendas a cada 2 minutos.</p></div>
      <div className="venture-purchase"><span>INVESTIMENTO INICIAL</span><strong>{money(offer.openingCost)}</strong><button disabled={game.money < offer.openingCost} onClick={() => { onOpen(offer.id); setSelected(offer.id); setDetailTab('home') }}>Abrir hortifrúti <span aria-hidden="true">→</span></button>{game.money < offer.openingCost && <small>Faltam {money(offer.openingCost - game.money)}</small>}</div>
    </article>}
  </>
}
