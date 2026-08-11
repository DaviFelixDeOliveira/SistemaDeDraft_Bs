---
name: ui-design-system
description: Diretrizes do Design System, tokens de cores gamer/esports, tipografia e boas práticas visuais para o TBK Hub (Brawl Stars).
---

# Design System & UI Guidelines — TBK Hub

Este documento define as diretrizes de design visual, cores, componentes e padrões de interface para o **TBK Hub · Sistema de Draft Brawl Stars**.

---

## 1. Paleta de Cores e Tokens Visuais

O design do TBK Hub utiliza uma estética **Dark Mode Gamer / Esports**, com alto contraste, efeitos neon e bordas refinadas.

### Cores Principais
- **TBK Pink (Marca Principal):** `#FF3366` — Usado em logotipos, destaques primários, botões de ação e sombras neon.
- **Trophy Gold (Destaque/Dourado):** `#FFCC00` — Usado em crachás, destaques de winrate, modos de jogo e títulos.
- **TBK Team (Sucesso / Nosso Time):** `#10B981` (Emerald 500 / 400) — Usado para picks do time TBK, vitórias e estados positivos.
- **Enemy Team (Perigo / Inimigo / Bans):** `#EF4444` (Red 500 / 400) — Usado para time adversário, bans e derrotas.

### Fundo e Superfícies (Dark Theme)
- **Fundo Principal (Canvas):** `#080808` / `#0A0A0A`
- **Cards e Painéis:** `#121212` / `#1A1A1A`
- **Superfícies Elevadas:** `#222222` / `zinc-900`
- **Bordas e Divisores:** `#2A2A2A` / `zinc-800` / `slate-200` (Modo claro)

---

##  2. Tipografia e Hierarquia

- **Família de Fontes:** Sans-serif moderna (Inter, system-ui).
- **Títulos (H1 / H2 / H3):** Fontes em peso `font-bold` ou `font-black`, com rastreamento justo (`tracking-tight`).
- **Números e Estatísticas:** Números grandes em destaque com pesos pesados e cores temáticas (`text-[#FFCC00]` ou `text-emerald-400`).

---

## 3. Componentes e Efeitos Visuais

### Efeitos de Neon e Brilho (Glows)
- **Brilho Rosa TBK:** `shadow-[0_0_20px_rgba(255,51,102,0.35)]`
- **Brilho Verde Vitória:** `shadow-[0_0_20px_rgba(16,185,129,0.3)]`
- **Brilho Vermelho Inimigo:** `shadow-[0_0_20px_rgba(239,68,68,0.3)]`

### Botões, Hover e Interatividade
- **Estado Padrão & Cursor:** Obrigatoriamente incluir `cursor-pointer` em todos os elementos clicáveis.
- **Animação de Hover Suave:** Transição fluida (`transition-all duration-300 ease-in-out`) com ligeiro aumento de escala (`hover:scale-[1.02]`).
- **Borda de Destaque no Hover:** Aumento sutil de contraste/intensidade na borda (ex: `border border-red-900/50 hover:border-red-500` ou `hover:border-zinc-500`).
- **Legibilidade & Contraste:** A cor do texto/ícone e do fundo no hover deve manter alto contraste (evitar fundos excessivamente escuros que apaguem a fonte).
- **Cantos Arredondados:** `rounded-xl` para cards grandes, `rounded-lg` para botões e `rounded-full` para badges.
- **Toque Mobile:** Usar `touch-manipulation` em botões interativos para resposta tátil imediata.

### Cards de Brawlers e Mapas
- **Brawlers:** Molduras com a cor da raridade/classe, ícone nítido, nome destacado e badges de tipo/classe.
- **Mapas:** Banner com imagem de fundo, badge de modo e terreno com contraste legível.

---

## 4. Responsividade e Mobile First

- **Grids Adaptáveis:** Usar `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` para ajustar layouts automaticamente do smartphone ao desktop.
- **Toque Amigável:** Manter botões e seletores com altura mínima de `py-3` ou `h-11` no mobile para fácil acionamento pelos dedos.