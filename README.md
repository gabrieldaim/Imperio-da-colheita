# Império da Colheita

Jogo de navegador em React com fazenda, evolução das sementes, funcionários, estoque e empreendimentos.

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
- Funcionários têm três profissões: plantador, regador e colhedor. Contratar custa inicialmente R$ 180, R$ 150 e R$ 200, respectivamente. Para cada contratação adicional da mesma profissão, o preço é multiplicado por 1,8. Não há salário nem XP de funcionário.
- Uma promoção custa `arredondar(preço base da profissão × 1,6 ^ nível atual)`. Cada nível permite designar mais um terreno, até o nível 10. A chance de habilidade especial começa em 10%, cresce 5 pontos percentuais por nível e chega a 55% no nível 10. O plantador pode plantar sem pagar a semente; o regador pode cortar pela metade o tempo da rega; o colhedor pode obter duas unidades. O jogador escolhe os terrenos e a semente de cada plantador. Só um funcionário de cada profissão atua em cada terreno.
- Ações automatizadas são processadas em ordem cronológica quando o jogo reabre. Funcionários não vendem os produtos. Sem dinheiro para a semente, o plantador aguarda. As ações manuais continuam disponíveis.
- A aba Empreendimentos permite abrir um restaurante por R$ 5.000 (pagamento único). O restaurante começa com um estoque separado e vazio. Nesta etapa ele não recebe itens, vende ou produz; o transporte e a operação serão definidos posteriormente.
- O jogo usa apenas `localStorage`, na chave `imperio-da-colheita:v1`. O progresso fica neste navegador e neste domínio; limpar os dados do site apaga o jogo.

As culturas e os números de equilíbrio estão em `src/game.js`. Esta versão não tem backend, conta de usuário ou sincronização entre dispositivos.
