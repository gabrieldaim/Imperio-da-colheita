# Império da Colheita

Jogo de navegador em React com fazenda, evolução das sementes, funcionários, empreendimentos e frete.

## Executar

Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite. Para conferir as regras e gerar a versão de produção:

```bash
npm test
npm run build
```

## Regras da primeira versão

- Você começa com R$ 100. O primeiro terreno custa R$ 80, e cada terreno seguinte custa `arredondar(80 × 1,8 ^ terrenos já comprados)`. O limite de segurança é de 20 terrenos.
- Cada plantio cobra o custo da semente. Plantar, regar e colher são três etapas cronometradas. Cada etapa seguinte exige um clique. Os prazos são horários reais e continuam correndo enquanto a página está fechada.
- Ao concluir a terceira etapa, uma unidade vai ao estoque, o terreno fica livre e a cultura ganha 1 XP. O nível pertence à cultura, não ao terreno. Os níveis 2, 3, 4 e 5 chegam com 2, 5, 9 e 14 XP acumulados. No nível 5, a próxima cultura é liberada.
- Cada nível aumenta o valor estimado em 8% e diminui o tempo de cada etapa em 5% (redução máxima de 80% do tempo base). O tempo é arredondado para cima em segundos. O custo da semente é fixo. Os valores de uma colheita são definidos quando ela é plantada e preservados no estoque.
- Os tempos base por etapa são trigo 10 s, milho 21 s, tomate 39 s, morango 64 s e uva 100 s. Os quatro últimos foram ajustados pela proporção 10/18 em relação aos tempos anteriores, com arredondamento ao segundo mais próximo.
- Comerciantes próximos pagam imediatamente 50% do valor estimado de cada unidade, arredondado para baixo. É possível vender uma unidade ou todas as unidades de uma cultura.
- A aba Funcionários separa Fazenda e Transporte e permite escolher uma profissão por vez para contratar, promover e designar os locais de atuação. As profissões são plantador, regador, colhedor, carregador e motorista. Contratar custa inicialmente R$ 180, R$ 150, R$ 200, R$ 6.000 e R$ 8.000, respectivamente. Para cada contratação adicional da mesma profissão, o preço é multiplicado por 1,8. Não há salário nem XP de funcionário.
- Uma promoção custa `arredondar(preço base da profissão × 1,6 ^ nível atual)`. Cada nível permite designar mais um terreno ou caminhão, até o nível 10. Para a equipe da fazenda, a chance de habilidade especial começa em 10%, cresce 5 pontos percentuais por nível e chega a 55% no nível 10. O plantador pode plantar sem pagar a semente; o regador pode cortar pela metade o tempo da rega; o colhedor pode obter duas unidades. O jogador escolhe os terrenos e a semente de cada plantador. Só um funcionário de cada profissão atua em cada terreno ou caminhão.
- Ações automatizadas são processadas em ordem cronológica quando o jogo reabre. Funcionários não vendem os produtos. Sem dinheiro para a semente, o plantador aguarda. As ações manuais continuam disponíveis.
- A aba Empreendimentos permite abrir um hortifrúti por R$ 40.000 (pagamento único), com 15 espaços de estoque inicial. Sua área de gestão tem Principal, Estoque e Relatórios. O estoque pode ganhar 15 espaços por ampliação; a primeira custa R$ 6.000 e cada seguinte custa 1,8 vez mais. Saves que abriram o antigo "restaurante" são convertidos para hortifrúti sem nova cobrança e preservam o estoque.
- O hortifrúti vende automaticamente a cada 2 minutos, inclusive durante o tempo em que o jogo estiver fechado. Começa com 0 a 2 visitantes aleatórios por ciclo; cada visitante tem 40% de chance de comprar uma unidade disponível. O preço é 100% do valor estimado gravado no lote da colheita. Produtos mais baratos têm peso maior na escolha. Se o cliente disposto a comprar encontrar a loja vazia, a venda perdida aparece no relatório. Unidades vendidas liberam espaço e caminhões aguardando descarregam na ordem de chegada.
- Melhorias permanentes da loja: Marketing evolui as visitas de 0–2 para 0–3, 1–4 e 2–5; depois o máximo recebe uma visita extra a cada dois níveis, até 19–30 no nível 20 (R$ 500 iniciais). Conversão acrescenta 5 pontos percentuais por nível, até 90% (R$ 700 iniciais). Venda adicional aumenta a chance em 10 pontos percentuais por nível e também a quantidade extra: nível 1 = 10% de +1; nível 2 = 20% de +1 a +2; nível 3 = 30% de +1 a +3; nível 4 = 40% de +2 a +4; seguindo até nível 8 = 80% de +6 a +8 unidades do mesmo produto, limitadas ao estoque (R$ 900 iniciais). Cada próxima melhoria da mesma categoria custa 1,8 vez mais. A aba Principal mostra o tempo até o próximo ciclo e os upgrades; Relatórios apresenta os totais e os últimos 20 ciclos, com visitas, compradores, vendas perdidas, produtos e faturamento.
- A aba Frete oferece caminhões de 25, 50, 75 e 100 unidades por R$ 12.000, R$ 28.000, R$ 48.000 e R$ 75.000. A viagem em cada sentido leva 30, 45, 60 e 75 segundos, respectivamente. É possível comprar vários veículos e revender um caminhão vazio na garagem por metade do preço original.
- O carregamento manual transfere unidades do estoque da fazenda para o caminhão, preservando o valor de cada lote. A saída exige carga, empreendimento aberto e pelo menos um espaço livre no destino. O caminhão pode sair com mais unidades do que o espaço disponível. Ao chegar, descarrega o que couber e espera com o restante. Cada novo espaço é preenchido automaticamente em ordem de chegada dos caminhões. Vazio, ele volta à fazenda e fica disponível para nova carga.
- O plano de carregamento de cada veículo define a prioridade entre culturas, quantidade máxima por cultura, reserva mínima na fazenda e carga mínima para a partida automática (padrão: metade da capacidade). Um carregador designado segue o plano. Um motorista designado escolhe um empreendimento aberto com espaço livre e inicia a viagem quando a carga mínima é atingida. Sem funcionário, todas essas ações podem ser feitas manualmente. O progresso das tarefas e viagens é retomado cronologicamente após fechar a página.
- O jogo usa apenas `localStorage`, na chave `imperio-da-colheita:v1`. O progresso fica neste navegador e neste domínio; limpar os dados do site apaga o jogo.

As culturas e os números de equilíbrio estão em `src/game.js`. Esta versão não tem backend, conta de usuário ou sincronização entre dispositivos.
