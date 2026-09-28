import React, { useState } from 'react'
import { CROPS, VENTURES, stockUpgradePrice } from './game.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)
const integer = amount => new Intl.NumberFormat('pt-BR').format(amount)
const amount = stock => stock.reduce((sum, item) => sum + item.quantity, 0)

export default function VenturesPanel({ game, onOpen, onExpand }) {
  const [selected, setSelected] = useState(null)
  const [detailTab, setDetailTab] = useState('home')
  const offer = VENTURES[0]
  const venture = game.ventures.find(item => item.id === selected)
  const opened = game.ventures.find(item => item.type === offer.id)

  if (venture) {
    const stock = venture.stock ?? []
    const used = amount(stock)
    const waiting = (game.trucks ?? []).filter(truck => truck.status === 'unloading' && truck.destinationId === venture.id)
    return <>
      <button className="venture-back" onClick={() => setSelected(null)}>← Voltar aos empreendimentos</button>
      <div className="venture-detail-head"><span aria-hidden="true">{offer.icon}</span><div><div className="eyebrow">EMPREENDIMENTO ABERTO</div><h1>{venture.name}</h1></div></div>
      <nav className="venture-tabs" aria-label="Áreas do hortifrúti">
        {[['home', 'Principal'], ['stock', 'Estoque'], ['reports', 'Relatórios']].map(([id, label]) =>
          <button key={id} className={detailTab === id ? 'active' : ''} onClick={() => setDetailTab(id)}>{label}</button>)}
      </nav>
      {detailTab === 'home' && <>
        <div className="venture-stat-grid">
          <div><span>ESTOQUE OCUPADO</span><strong>{integer(used)}/{integer(venture.capacity ?? 15)}</strong><small>unidades</small></div>
          <div><span>ENTREGAS RECEBIDAS</span><strong>{integer(venture.deliveries ?? 0)}</strong><small>viagens concluídas</small></div>
          <div><span>CAMINHÕES AGUARDANDO</span><strong>{integer(waiting.length)}</strong><small>para descarregar</small></div>
        </div>
        <div className="venture-info-card"><h2>Seu hortifrúti está aberto</h2><p>O estoque recebe produtos enviados pela aba Frete. Vendas e operação comercial serão a próxima etapa.</p>
          <button onClick={() => setDetailTab('stock')}>Consultar estoque →</button></div>
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
        <div className="section-head"><div><div className="eyebrow">HISTÓRICO DO NEGÓCIO</div><h2>Relatórios</h2><p>Indicadores registrados desde a abertura do hortifrúti.</p></div></div>
        <div className="venture-stat-grid">
          <div><span>UNIDADES RECEBIDAS</span><strong>{integer(venture.receivedUnits ?? 0)}</strong><small>via frete</small></div>
          <div><span>ENTREGAS CONCLUÍDAS</span><strong>{integer(venture.deliveries ?? 0)}</strong><small>caminhões esvaziados</small></div>
          <div><span>ESTOQUE ATUAL</span><strong>{integer(used)}</strong><small>unidades disponíveis</small></div>
        </div>
        <div className="tip-banner"><span aria-hidden="true">✦</span><p>Os relatórios de vendas serão incluídos quando a operação do hortifrúti estiver pronta.</p></div>
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
      <div className="venture-offer-copy"><span className="eyebrow">DISPONÍVEL PARA ABERTURA</span><h3>{offer.name}</h3><p>Seu primeiro negócio com estoque próprio de 15 unidades. Transporte, equipe e vendas serão desenvolvidos por etapas.</p></div>
      <div className="venture-purchase"><span>INVESTIMENTO INICIAL</span><strong>{money(offer.openingCost)}</strong><button disabled={game.money < offer.openingCost} onClick={() => { onOpen(offer.id); setSelected(offer.id); setDetailTab('home') }}>Abrir hortifrúti <span aria-hidden="true">→</span></button>{game.money < offer.openingCost && <small>Faltam {money(offer.openingCost - game.money)}</small>}</div>
    </article>}
  </>
}
