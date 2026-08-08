# 🏆 TBK Hub — Sistema de Draft e Analytics para Brawl Stars

> Ferramenta interna de suporte à performance competitiva do time **TBK** no Brawl Stars.
> Gerencia o processo completo de draft, registra scrims e gera estatísticas reais com base em partidas jogadas.

---

## 🎯 Sobre o Projeto

O **TBK Hub** é um sistema de draft e analytics competitivo desenvolvido exclusivamente para o time TBK. Ele resolve um problema concreto: times competitivos precisam de dados reais das próprias partidas para tomar decisões de draft — não apenas de estatísticas genéricas da comunidade.

O sistema foi construído sob a filosofia **"Dia 0"**: começa completamente zerado e vai ficando mais inteligente conforme partidas reais são registradas. No primeiro uso, as recomendações são baseadas em tier meta e mecânicas de mapa. Após algumas scrims registradas, o sistema passa a ponderar winrate histórico por brawler/mapa, picks mais usados, bans frequentes e counters observados em partida.

---

## ✨ Funcionalidades Principais

### 📊 Dashboard
Painel de estatísticas em tempo real, calculadas exclusivamente com base nas partidas registradas pelo time. Exibe winrate geral, partidas recentes, brawlers mais usados (hot picks da semana), top banimentos, e gráficos de desempenho por brawler e mapa.

### 🎮 Draft Wizard
Assistente completo de picks e bans. Guia o time pelo processo de draft em 5 etapas:
1. Seleção do mapa e modo de jogo
2. Bans da TBK e bans inimigos
3. Picks em ordem snake (1-2-2-1)
4. Vinculação de jogadores e registro do resultado
5. Atualização automática do banco de dados

O motor de recomendação pontua brawlers com base em: tier meta, comfort picks do elenco ativo, adaptação ao terreno do mapa, counters diretos identificados, sinergias do trio e histórico de winrate no mapa.

### 👥 Central de Jogadores
Cadastro e gestão dos atletas do time. Registra nickname, comfort picks (brawlers que o atleta domina) e status ativo/inativo. Exibe estatísticas individuais (winrate, partidas jogadas, brawlers mais utilizados) calculadas com base nas scrims registradas.

### 🗺️ Central de Mapas e Modos
Biblioteca completa dos mapas em uso. Permite cadastrar novos mapas com código do Brawlify CDN (gera preview automático), visualizar histórico de picks/bans/winrate por mapa e consultar os top counters registrados pelo time inimigo.

### 🦸 Central de Brawlers
Catálogo completo de brawlers com tier, tipo, mecânicas especiais (quebra paredes, caminha na água, etc.) e estatísticas acumuladas de uso em scrims. Permite editar tier e atributos diretamente pelo painel.

---

## ⚙️ Como o Sistema Funciona

### O Conceito de "Dia 0"

O TBK Hub foi pensado para crescer com o time. No início (Dia 0), não há nenhuma partida registrada, então o sistema não tem histórico próprio. Nesse estado:

- O motor de recomendação usa apenas **tier meta + mecânicas do mapa** como base de pontuação
- O Dashboard exibe zeros e vazios — isso é esperado e correto
- As estatísticas por jogador e por mapa ainda não existem

Conforme scrims são registradas, o sistema acumula dados reais e as recomendações ficam progressivamente mais precisas. A fórmula de pontuação histórica é:

```
Bônus Histórico = (winrateNoMapa − 50) × min(totalPicks, 10) × 10
```

No Dia 0, `totalPicks = 0` e o bônus é exatamente zero. Com 5 partidas no mapa, o sistema já começa a ponderar winrate real.

### Banco de Dados (Supabase)

Todos os dados persistem em tabelas Supabase:

| Tabela | Conteúdo |
|---|---|
| `brawlers` | Catálogo de brawlers com atributos e tier |
| `maps` | Biblioteca de mapas e modos |
| `players` | Elenco do time e comfort picks |
| `scrims` | Partidas registradas (mapa, resultado, bans) |
| `scrim_picks` | Picks individuais por partida |
| `scrim_bans` | Bans individuais por partida |

---

## 📖 Tutorial de Uso

### 1. Cadastrar um Jogador

1. Acesse **Jogadores** no menu lateral
2. Clique em **Novo Jogador**
3. Preencha nickname e selecione os comfort picks (brawlers que esse atleta domina)
4. Salve — o jogador fica disponível para vinculação no Draft

### 2. Rodar um Draft Completo

**Etapa 1 — Seleção de Mapa**
Escolha o mapa da partida. O sistema carrega automaticamente o histórico desse mapa (winrate, top picks, bans) e ajusta o motor de recomendação.

**Etapa 2 — Bans**
Registre os bans do time TBK e do adversário. O sistema considera os bans ao calcular disponibilidade de brawlers na fase de picks.

**Etapa 3 — Picks (Fase de Draft)**
Os slots aparecem na ordem snake (1-2-2-1). Quando for a vez da TBK:
- O motor de IA exibe os **Top 3 brawlers recomendados** com pontuação explicada
- Brawlers com 🟢 são comfort picks de atletas ativos do elenco
- Brawlers tier S têm borda dourada destacada
- Clique no brawler para confirmar o pick; picks inimigos são registrados manualmente

**Etapa 4 — Resultado e Atribuição de Jogadores**
Após o draft, vincule cada pick a um jogador do elenco (o sistema sugere automaticamente com base nos comfort picks). Selecione **Vitória** ou **Derrota**.

**Etapa 5 — Salvar**
Clique em **Salvar Resultado da Scrim**. Os dados são gravados no Supabase e o Dashboard é atualizado imediatamente.

### 3. Interpretar as Estatísticas no Dashboard

Após algumas partidas registradas:

- **Winrate Geral** — porcentagem de vitórias sobre o total de scrims
- **Brawlers Quentes** — brawlers com mais picks nas últimas partidas
- **Top Banimentos** — brawlers mais banidos por qualquer um dos times
- **Performance por Brawler/Mapa** — winrate individual em cada contexto

> **Nota:** Todas as métricas aparecem zeradas até a primeira partida ser registrada. Esse é o comportamento correto do sistema no Dia 0.

---

## 🛠️ Stack Técnica

| Tecnologia | Versão | Uso |
|---|---|---|
| **React** | 19 | Framework UI principal |
| **TypeScript** | 5.8 | Tipagem estática |
| **Vite** | 6 | Build tool e dev server |
| **Supabase** | 2.x | Banco de dados PostgreSQL + backend |
| **Tailwind CSS** | v4 | Estilização |
| **Recharts** | 3.x | Gráficos e visualizações do Dashboard |
| **Lucide React** | 0.5x | Ícones |
| **Motion** | 12.x | Animações (Framer Motion) |

---

## 🚀 Executar Localmente

### Pré-requisitos

- Node.js 18+
- Conta e projeto configurado no [Supabase](https://supabase.com)

### Passos

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie `.env.example` para `.env.local` e preencha com suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O app estará disponível em `http://localhost:3000`.

4. **Build de produção** (opcional):
   ```bash
   npm run build
   ```
