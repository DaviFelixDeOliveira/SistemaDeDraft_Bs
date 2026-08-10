# Ideias Futuras

Backlog de melhorias ordenado da **mais necessária** para a **menos necessária**.

---

## 🔴 FASE 1: Alta Prioridade (Segurança, Usabilidade & Persistência)

- [ ] **1. Backup dos dados / Sistema de Restauração (Item 21)**
  Salvar todos os dados do sistema em JSON e permitir restaurar brawlers, mapas, players, picks de conforto e tags customizadas com 1 comando ou botão.

- [ ] **2. Manter tela e rascunho do draft ao reiniciar a página (Item 15)**
  Ao recarregar a página (web ou mobile), o sistema deve manter a última tela em que o usuário estava e carregar as informações do draft que estavam em andamento via `localStorage`.

- [ ] **3. Níveis de Acesso — Administrador vs Player (Item 20)**
  Adicionar sistema de senha/acesso para administrador e jogador. O administrador pode alterar jogadores, tiers de brawlers e mapas; o player pode apenas visualizar e selecionar seus brawlers e picks de conforto.

- [ ] **4. Botão de limpar campos do draft (Item 16)**
  Adicionar um botão de reset rápido no assistente de draft que limpa todos os campos e picks de uma só vez.

- [ ] **5. Adicionar brawlers de conforto pressionando Enter (Item 11)**
  Ao selecionar um brawler de conforto, adicioná-lo automaticamente ao apertar Enter e fechar o modal, acelerando a seleção contínua.

---

## 🟡 FASE 2: Média Prioridade (Algoritmo, Mobile & Atributos)

- [ ] **6. Ajustes de Usabilidade Mobile (Item 18)**
  - Botão de arquivar jogador ao lado do nome com modal de confirmação.
  - Ativar tags customizadas ao clicar fora ou apertar Enter no teclado mobile.
  - Sincronização em tempo real das alterações feitas via web no dispositivo mobile.

- [ ] **7. Campo de DPS por brawler (Item 2)**
  Adicionar campo `dps` (Alto / Médio / Baixo) no cadastro de brawlers para influenciar modos que exigem dano sustentado (ex: Roubo).

- [ ] **8. Prioridade por Objetivos do Modo de Jogo (Item 3)**
  Cadastrar os objetivos reais e sub-objetivos de cada modo (ex: Caça-Estrelas valoriza sobrevivência + eliminações em relação a dano bruto).

- [ ] **9. Exibir Objetivos e Bans Recomendados por Modo (Item 13)**
  Exibir na tela as dicas de objetivo do modo e sugestões de brawlers recomendados para banir ou escolher dependendo de ser First Pick ou Last Pick.

- [ ] **10. Adicionar mais atributos dos brawlers (Item 12)**
  Cadastrar informações complementares: DPS, velocidade de movimento, alcance, etc.

- [ ] **11. Indicador de Confiança/Amostra do Winrate (Item 4)**
  Sinalizar visualmente quando uma sugestão do algoritmo vem de poucas partidas (ex: 2 jogos) vs amostragem consolidada (ex: 50 jogos).

- [ ] **12. Adicionar mais filtros na lista de brawlers (Item 17)**
  Adicionar filtros por classe, raridade, modo de jogo recomendado, etc.

- [ ] **13. Ajustes de Cores e Contraste da Interface (Item 14)**
  Ajustar paleta de cores e contraste para melhorar a leitura e navegação visual.

---

## 🟢 FASE 3: Baixa Prioridade (Análises Avançadas & Ajustes Textuais)

- [ ] **14. Detecção automática de Arquétipo de Composição (Item 7)**
  Reconhecer padrões de composições no draft (ex: "Comp de Poke", "Double Tank", "Dive Comp").

- [ ] **15. Detecção de Tendência do Meta Interno (Item 5)**
  Comparar winrate recente (últimas N partidas) contra o histórico antigo para identificar brawlers em alta ou em queda nas scrims.

- [ ] **16. Perfil/Scouting de Adversários Recorrentes (Item 6)**
  Manter histórico específico contra times adversários frequentes (picks favoritos e bans comuns deles).

- [ ] **17. Exportar Relatório Pós-Scrim (Item 8)**
  Gerar imagem ou PDF resumido da sessão de treino para compartilhamento rápido.

- [ ] **18. Alerta de Rotação de Mapas (Item 9)**
  Alertar se determinados mapas não estão sendo escolhidos há muito tempo.

- [ ] **19. Sincronização Automática de Tier List via API (Item 10)**
  Automação para atualizar os tiers (S/A/B/C/D) dos brawlers a cada novo patch de balanceamento.

- [ ] **20. Tradução para Inglês e Espanhol — i18n (Item 1)**
  Seletor de idiomas na interface extraindo todas as strings para internacionalização.

- [ ] **21. Ajustes nas Frases Descritivas de Modos e Mapas (Item 19)**

  Ajustar os textos explicativos exibidos nos modais de imagens dos mapas.
  - Mapa fechado: "Mapa fechado com muitas paredes, ideal para assassinos, tanques e brawlers de curto alcance."
  - Mapa aberto: "Mapa aberto com poucas zonas de proteção, ideal para atiradores e controle de mapa."
  - Mapa semi-aberto: "Mapa semi-aberto com uma mistura de zonas abertas e zonas de proteção, ideal para uma variedade de brawlers, sendo eles assassinos ou atiradores."