# Ideias Futuras

Backlog de melhorias ordenado da **mais necessária** para a **menos necessária**.
**Aviso:** Antes de fazer, debata sobre a ideia, e me diga como fará ela e se podemos fazer, se aprovado, implemente.

---

##  FASE 1: Alta Prioridade 

- [x] **1. Backup dos dados / Sistema de Restauração**
  Salvar todos os dados do sistema em JSON e permitir restaurar brawlers, mapas, players,
  picks de conforto e tags customizadas com 1 clique. Adicionar um botão visível na
  interface para isso (exportar e importar).

- [x] **2. Manter tela e rascunho do draft ao reiniciar a página**
  Ao recarregar a página (web ou mobile), o sistema deve manter a última tela em que o
  usuário estava e carregar as informações do draft que estavam em andamento via
  `localStorage`.

- [x] **3. Níveis de Acesso — Administrador vs Player**
  Adicionar sistema de senha/acesso para administrador e jogador. O administrador pode
  alterar jogadores, tiers de brawlers e mapas; o player pode apenas visualizar, cadastrar composições para cada mapa e selecionar seus picks de conforto.

- [x] **4. Botão de limpar campos do draft**
  Adicionar um botão de reset rápido no assistente de draft que limpa todos os campos e
  picks de uma só vez.

- [x] **5. Adicionar brawlers de conforto pressionando Enter**
  Ao selecionar um brawler de conforto, adicioná-lo automaticamente ao apertar Enter e
  fechar o modal, acelerando a seleção contínua.

- [x] **6. Botões "Salvar como meta do mapa" e "Salvar vitória da scrim" ao vencer**
  Na tela de draft, ao vencer uma partida, mostrar dois botões:
  - **Salvar como meta do mapa**: salva aquela composição (picks/bans) como composição de
    referência daquele mapa. Ela deve aparecer na tela de Mapas & Modos, na seção de
    composições cadastradas daquele mapa, e o sistema deve exibi-la como referência sempre
    que aquele mapa for selecionado num novo draft.
  - **Salvar vitória da scrim**: registra a partida como vitória normal (como já acontece
    hoje), somando +1 vitória para aquele mapa, modo, brawler e jogador — sem criar
    nenhuma composição de meta.

- [x] **7. Corrigir/investigar a atribuição de jogador por brawler**
  Existe um seletor para associar qual jogador jogou com cada brawler pickado, mas hoje
  parece não ter nenhum efeito visível. O objetivo real é alimentar o "perfil de cada
  jogador" com quantas partidas ele jogou com cada brawler e o winrate dele especificamente
  com aquele brawler, para apoiar decisões futuras de escalação. Investigar se o dado está
  sendo salvo e se está sendo exibido em algum lugar (ex: tela de Players), e corrigir a
  ponta que estiver faltando.

- [x] **8. Remover "Carregando métricas..." do Dashboard**
  Ao entrar na tela de Dashboard aparecem duas mensagens em sequência: "Carregando
  módulo..." e depois "Carregando métricas...". Remover a segunda mensagem.

- [x] **9. Corrigir Winrate por Modo na Tela de Desempenho**
  A tela de "Desempenho por Modo" exibe `0V / 0D` mesmo com partidas cadastradas. Ajustar o
  cálculo do filtro para contabilizar e exibir corretamente as partidas reais.
  > **Exemplo:** Se houver 2 vitórias registradas no modo Roubo e 1 em Fute-Brawl, a tela deve exibir exatamente `2V - 0D (100% WR)` em Roubo e `1V - 0D (100% WR)` em Fute-Brawl.

- [x] **10. Corrigir Posição dos Botões de Ação na Card do Player**
  Ao passar o mouse sobre o card do jogador, os botões de editar/arquivar aparecem em cima
  da tag de "Titular" / "Reserva". Fixar os botões de ação em uma camada/header dedicado e
  permanente no topo do card, evitando sobreposição de elementos no hover.

- [x] **11. Ajustar Exibição da Winrate em Mapas & Modos**
  Ao alterar o modo de jogo selecionado, garantir que a interface mostre a Winrate Global,
  a Winrate Específica do Modo selecionado e as winrates individuais de cada mapa
  pertencente àquele modo (mapas sem partida ficam em 0%).

- [x] **12. Novo Fluxo de Sessões de Treino (Scrims) & Histórico**
  - Substituir o filtro genérico "Último Treino / 24h" por um gerenciador de sessão ativo com
    botões de **"Iniciar Treino"** e **"Encerrar Treino"** (com confirmação e opção de cancelar).
  - Criar uma tela/aba dedicada de **Histórico de Treinos** exibindo relatório completo das
    sessões (mapas, bans, picks e desempenho dos atletas).

- [x] **13. Ajustes de Permissões, Acesso & UX do Backup**
  - Remover totalmente a opção de backup/restauração da interface do perfil Player.
  - Redesenhar o canto inferior esquerdo (Sidebar Footer) com uma pílula/tag compacta e
    elegante para o nível de acesso.
  - Adicionar modal de confirmação e botão de "Cancelar" durante o processamento do backup.
  - Permitir ao Admin escolher o destino do salvamento (Pasta Downloads, Pasta do Projeto ou Ambos).
  - Bloquear expressamente no perfil PLAYER a criação, edição e exclusão de Brawlers, Mapas e Perfis,
    permitindo apenas cadastrar Picks de Conforto, Composições Meta e exportar relatórios.

- [ ] **14. Melhoria no Design do Filtro de Brawlers**
  Ajustar o design do filtro que está comprimido e feio (foto 2). Ajeitar o alinhamento, espaçamento e visual dos dropdowns e seletores de busca para que fiquem bem apresentados e legíveis.

- [ ] **15. Design dos Brawlers na Tela de Draft**
  - Exibir a cor correspondente à raridade de cada brawler (igual já existe na tela de brawlers).
  - Brawlers bloqueados devem mostrar abaixo o motivo de estarem bloqueados (se foi pego pelo time adversário, pelo nosso time, se foi banido, etc.).
  - Ao passar o mouse sobre qualquer brawler disponível, exibir um card/pop-up bonito que não polua o sistema mostrando Raridade e Tier do Meta primeiro (e outras informações adicionais se não ficar feio/poluído).

- [ ] **16. Redesign e Padronização Global de Botões**
  Ajustar o design de todos os botões do sistema que estão com estilo texto/escuro e ilegíveis no modo escuro ao passar o mouse (foto 3). Devem seguir a essência, estilo, tamanho e presença de botão real semelhante ao modelo da imagem 4 para todos os botões da aplicação.

- [x] **17. Não Salvar Treinos Vazios no Histórico**
  Quando apertar em "Iniciar Treino" na tela de draft, se não for registrada nenhuma partida nesse intervalo de tempo, o sistema não deve salvar o treino vazio no histórico de tempo ao finalizar.

- [ ] **18. Botão de Exportar Treino (Imagem / PDF)**
  Adicionar a função e o botão de exportar o treino (seja em imagem ou PDF), deixando o botão já presente na interface ainda que em fase de estruturação.

- [x] **19. Ações de Voltar no Draft (Ctrl + Z e Botão Voltar Mobile)**
  Fazer com que as ações de voltar funcionem no sistema (ex: `Ctrl + Z` ou botão de voltar do celular). Exemplo: se selecionei um ban e apertar voltar, o sistema retira o ban e permite colocar de novo.

- [ ] **20. Busca Global de Mapa com Troca Automática de Modo**
  O filtro de buscar mapa deve funcionar para todos os mapas na tela de mapas e modos, não só para o modo selecionado. Exemplo: se procurar "Mina Rochosa" (mapa de Pique-Gema) mas estiver no modo Nocaute, o sistema deve mostrar o mapa "Mina Rochosa" e mudar automaticamente para o modo Pique-Gema.

---

##  FASE 2: Média Prioridade

- [x] **14. Ajustes de Usabilidade Mobile**
  - Botão de arquivar jogador ao lado do nome com modal de confirmação.
  - Ativar tags customizadas ao clicar fora ou apertar Enter no teclado mobile.
  - Sincronização em tempo real das alterações feitas via web no dispositivo mobile, sem necessidade de atualizar a página, mas permitir 2 scrims serem inseridas ao mesmo tempo sem crashar.

- [x] **15. Exibir Objetivos do Modo e Sugestões Visuais no Draft**
  Exibir na tela do draft os cards visuais com as dicas de objetivo do modo e sugestões de brawlers recomendados para banir ou escolher (dependendo de ser First Pick ou Last Pick).
  > **Exemplo:** Se for *First Pick* em mapa aberto, a tela destaca um card avisando que o mapa é aberto e recomenda para banir os counters diretos de tiros precisos ou sugestionando a escolha de atiradores imediatamente. *(Cálculo das sugestões realizado pelo Item 11 do Algoritmos Futuros)*.

- [ ] **16. Formulário de Atributos Complementares do Brawler**
  Criar campos de cadastro no perfil do brawler para input manual de atributos informativos (DPS, Alcance, Velocidade de Movimento, Tipo de Dano) para que sirvam de consulta na tela e alimentem o motor de recomendação. *(Ver Item 12 de Algoritmos Futuros)*. Esse item ainda nao implemente, está sendo pensado.

- [ ] **17. Indicador de Confiança/Amostra do Winrate (Badge Visual)**
  Sinalizar visualmente na interface quando uma sugestão do algoritmo vem de poucas partidas vs amostragem consolidada.
  > **Exemplo:** Um brawler com 100% WR baseado em apenas 2 jogos exibe uma badge de aviso `⚠️ Baixa amostragem (2 jogos)`, enquanto um com 65% WR em 40 jogos exibe `✅ Alta Confiança (40 jogos)`.

- [ ] **18. Filtros Avançados na Lista de Brawlers (Global)**
  Implementar filtros avançados por Classe, Raridade, Tier do Meta (S/A/B/C/D) e Ordem Alfabética em **todos** os locais onde há seleção de brawlers (Draft, Bans, Tela de Brawlers, Picks de Conforto, Teste de Variação na Derrota, etc.), dispensando a necessidade de digitar para encontrar mas não remova a função de digitar.

- [ ] **19. Ajustes de Cores e Contraste da Interface**
  Ajustar paleta de cores e contraste para melhorar a leitura e navegação visual em ambientes escuros e claros.

- [x] **20. Redesign do Layout de Desempenho, Picks e Badges**
  Reorganizar visualmente os cards de "Winrate Geral", "Picks" e "Comfort Picks" para eliminar a sensação de poluição visual. Atualizar o card de Comfort Picks na tela do Brawler para exibir atletas que o marcaram como conforto e quantidade de partidas reais jogadas com ele. Reformular a badge do header para um estilo pílula iluminada (ex: `104 Brawlers Disponíveis`).

- [x] **21. Navegação Sidebar Retrátil (Collapsible)**
  Adicionar botão de alternância para recolher a sidebar no web (exibindo apenas ícones) e mostrar Tooltips com o nome da tela ao passar o mouse sobre os ícones no modo compacto. No modo mobile, manter como já está.

- [x] **22. Suporte a Tema Claro / Escuro Automático**
  Definir o Modo Claro como padrão de entrada e sincronizar automaticamente com o tema do sistema/dispositivo via `prefers-color-scheme`.

- [ ] **23. Interface de Seleção em Massa por Mapa (Edição em Lote)**
  Na tela de edição do Mapa, criar uma grade/lista interativa para permitir ao usuário marcar ou desmarcar múltiplos brawlers de uma só vez como "Recomendados (Bons)" ou "Não Recomendados (Ruins)", sem precisar abrir modal item por item.

---

##  FASE 3: Baixa Prioridade 

- [ ] **24. Badges Visuais de Arquétipos e Tendências no Draft**
  Criar componentes de texto e ícones no assistente de draft para exibir em tempo real a identificação de arquétipos da composição e tendências do meta.
  > **Exemplo:** Exibir no topo do draft a badge `🛡️Double Tank + Poco` ou `🔥 Em Alta no Meta Interno`. *(Processado pelos Itens 13 e 14 de Algoritmos Futuros)*.

- [ ] **25. Perfil/Scouting de Adversários Recorrentes (Interface)**
  Exibir tela com histórico de partidas contra rival específico (picks favoritos e bans mais comuns dele).
  > *Nota de dependência:* Implementar esta interface apenas quando a funcionalidade de login por equipes (SaaS / Item 30) estiver pronta, garantindo a identificação dos times adversários.

- [x] **26. Alerta de Rotação de Mapas no Dashboard**
  Criar um card de aviso no dashboard notificando sobre mapas que estão há muitos dias sem serem treinados pela equipe.
  > **Exemplo:** `⚠️ O mapa "Tocaia" não é treinado há 12 dias. Considere incluí-lo na próxima scrim.`

- [ ] **27. Sincronização Automática de Tier List via API**
  Automação para atualizar os tiers (S/A/B/C/D) dos brawlers a cada novo patch de balanceamento oficial do Brawl Stars.
  > *Nota de desenvolvimento:* Estudar viabilidade técnica de consumo de APIs públicas/comunitárias ou web scraping antes da implementação.

- [ ] **28. Tradução para Inglês e Espanhol — i18n**
  Seletor de idiomas na interface extraindo todas as strings para internacionalização.
  > **Idiomas suportados:** Português (PT-BR), Inglês (EN) e Espanhol (ES). A tradução deve cobrir desde a interface até as descrições de mapas, regras de modos, nome dos mapas e alertas do draft.

- [ ] **29. Ajustes nas Frases Descritivas de Modos e Mapas**
  Ajustar os textos explicativos exibidos nos modais de imagens dos mapas:
  - **Mapa fechado:** "Mapa fechado com muitas paredes, ideal para assassinos, tanques e brawlers de curto alcance."
  - **Mapa aberto:** "Mapa aberto com poucas zonas de proteção, ideal para atiradores e controle de mapa."
  - **Mapa semi-aberto:** "Mapa semi-aberto com uma mistura de zonas abertas e zonas de proteção, ideal para uma variedade de brawlers, sendo eles assassinos ou atiradores."

- [ ] **30. Arquitetura Multi-tenant & Autenticação para Comercialização (SaaS)**
  Separar dados globais/oficiais (brawlers, atributos, imagens) de dados customizados por equipe (`team_id`). Criar sistema de login real e cadastro de organizações via banco de dados (JWT/Supabase/Firebase) para permitir a venda e isolamento do software para múltiplos times.

- [ ] **31. Exportação Visual de Relatórios Pós-Scrim (Imagem e PDF)**
  Na tela de **Histórico de Treinos**, permitir visualizar o resumo de qualquer sessão passada e exportá-lo nos formatos **PNG (Imagem)** ou **PDF**.
  - **Aspecto Visual:** O arquivo exportado deve ser estilizado como um card de esportes/infográfico gamer (tema escuro com detalhes neon, fotos dos brawlers, mapas e escuderia das equipes). Não deve ser um documento apenas textual.
  - **Informações Obrigatórias no Card Exportado:**
    1. Data, hora de início e hora de término do treino.
    2. Nome da Nossa Equipe vs Nome da Equipe Adversária.(isso implementar apenas quando tiver a `função 30 - Arquitetura Multi-tenant & Autenticação para Comercialização (SaaS)`)
    3. Jogadores escalados da nossa equipe (puxando os perfis cadastrados no sistema).
    4. Placar Geral (ex: `TBK 5 x 2 Rival · 71% WR`).
    5. Lista visual de partidas jogadas com: Mapa/Modo selecionado, Brawlers banidos por cada lado, e Composições escolhidas (3 Brawlers de cada time com os nomesdos atletas).