# Império da Colheita

Jogo de navegador em React. Esta primeira etapa contém a fazenda, a evolução das sementes e a venda instantânea do estoque.

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
- Comerciantes próximos pagam imediatamente 50% do valor estimado de cada unidade, arredondado para baixo. É possível vender uma unidade ou todas as unidades de uma cultura.
- O jogo usa apenas `localStorage`, na chave `imperio-da-colheita:v1`. O progresso fica neste navegador e neste domínio; limpar os dados do site apaga o jogo.

As culturas e os números de equilíbrio estão em `src/game.js`. Esta versão não tem backend, conta de usuário ou sincronização entre dispositivos.
