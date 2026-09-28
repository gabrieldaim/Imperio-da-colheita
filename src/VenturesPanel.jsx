import React from 'react'
import { CROPS, VENTURES } from './game.js'

const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)
const integer = amount => new Intl.NumberFormat('pt-BR').format(amount)

export default function VenturesPanel({ game, onOpen }) {
  const offer = VENTURES[0]
  const hortifruti = game.ventures.find(item => item.type === offer.id)
  const stock = hortifruti?.stock ?? []
  const quantity = stock.reduce((sum, item) => sum + item.quantity, 0)
  return <>
    <section className="ventures-hero"><div><span className="eyebrow">A PRÓXIMA CAMADA DO SEU IMPÉRIO</span><h1>Empreendimentos<span>.</span></h1><p>Da produção no campo ao seu próprio negócio. Comece abrindo um hortifrúti.</p></div><div className="ventures-hero-icon" aria-hidden="true">🥬</div></section>
    {!hortifruti ? <>
      <div className="section-head"><div><div className="eyebrow">NOVAS OPORTUNIDADES</div><h2>Abra seu primeiro negócio</h2><p>O custo de abertura é pago uma vez, usando seu saldo atual.</p></div></div>
      <article className="venture-offer">
        <div className="venture-offer-icon" aria-hidden="true">{offer.icon}</div>
        <div className="venture-offer-copy"><span className="eyebrow">DISPONÍVEL PARA ABERTURA</span><h3>{offer.name}</h3><p>Um espaço seu, com estoque próprio. O transporte de produtos e as vendas do hortifrúti serão adicionados nas próximas etapas.</p></div>
        <div className="venture-purchase"><span>INVESTIMENTO INICIAL</span><strong>{money(offer.openingCost)}</strong><button disabled={game.money < offer.openingCost} onClick={() => onOpen(offer.id)}>Abrir hortifrúti <span aria-hidden="true">→</span></button>{game.money < offer.openingCost && <small>Faltam {money(offer.openingCost - game.money)}</small>}</div>
      </article>
    </> : <>
      <div className="section-head"><div><div className="eyebrow">SEU NEGÓCIO</div><h2>{hortifruti.name} <span className="venture-open">● Aberto</span></h2><p>Seu primeiro empreendimento fora da fazenda.</p></div></div>
      <div className="venture-summary"><div className="venture-summary-icon" aria-hidden="true">{offer.icon}</div><div><span>ESTOQUE DO HORTIFRÚTI</span><strong>{integer(quantity)} {quantity === 1 ? 'unidade' : 'unidades'}</strong><small>Separado do estoque da fazenda</small></div></div>
      <div className="section-head venture-stock-heading"><div><div className="eyebrow">PRODUTOS ARMAZENADOS</div><h2>Estoque do hortifrúti</h2><p>Consulte os itens disponíveis neste empreendimento.</p></div></div>
      {stock.length === 0 ? <div className="venture-empty"><div aria-hidden="true">📦</div><h3>O estoque ainda está vazio</h3><p>O hortifrúti já está aberto. O envio dos produtos da fazenda virá com a etapa de frete.</p></div> :
        <div className="venture-stock-list">{stock.map((item, index) => {
          const crop = CROPS.find(candidate => candidate.id === item.cropId)
          return <div className="venture-stock-row" key={`${item.cropId}-${index}`}><span aria-hidden="true">{crop?.icon ?? '📦'}</span><strong>{crop?.name ?? item.cropId}</strong><span>{integer(item.quantity)} {item.quantity === 1 ? 'unidade' : 'unidades'}</span></div>
        })}</div>}
    </>}
  </>
}
