# Draft Automático — fundação técnica (fase 1)

## Objetivo e limites atuais
O produto é **primeiramente para treinos de equipes**, com ou sem coach. Modo campeonato é opcional e futuro. A captura automatizada **não está pronta** nesta fase, e **não existe ligação direta com uma sala Brawl Stars**. O sistema manual continua intacto.

Este PR estabelece contrato único de observações, validação de sequência de picks, estados de revisão de conflitos e testes regressivos. Há também um laboratório local para inspecionar como o sistema **receberia** observações. No laboratório, selecionar `screen` **simula** o evento — não captura ou reconhece a tela.

## Fluxo final pretendido

1. Coach autenticado cria sessão com código temporário. O código é um **identificador**, nunca senha, autorização ou chave Supabase.
2. Jogador entra via app Android/iOS, confirma sessão e concede permissão explícita de captura pelo sistema operacional. A permissão deve ser revogável; capturas em andamento visíveis ao jogador.
3. App envia amostras de tela protegidas por conexão autenticada para reconhecimento ou reconhece localmente e envia apenas eventos estruturados.
4. O reconhecimento extrai mapa, etapa, equipe, slot e brawler, com medição calibrada de confiança. Imagem incerta ou contraditória vai para revisão do coach.
5. Coach aplica correções manuais. Eventos autorizados e confirmados integram o Draft existente e recalculam as recomendações; nenhum evento deve alterar histórico de partidas sem confirmação explícita.

## Contrato de eventos
`src/lib/draftAutoProtocol.ts`:
- `map`: id do mapa;
- `first-pick`: quem começa;
- `ban`: equipe, slot 0..2, id do brawler;
- `pick`: posição global 0..5, equipe, id do brawler;
- `assignment`: brawler selecionado e id do jogador cadastrado.

Origem `manual`, `screen` ou `provider`; `eventId` para idempotência; `confidence` entre 0 e 1. A confiança **não é calculada aqui**: o futuro reconhecedor terá de estimá-la; nunca preencher 0.99 arbitrariamente. Valores temporários de política: captura requer >= 0.90, provedor >= 0.80. Contradições com correção manual exigem revisão, exceto um provedor autorizado com confiança >= 0.98; qualquer integração externa precisa ser verificada no servidor.

Os IDs recebidos precisam ser conferidos contra catálogos e a equipe/sessão autorizadas no backend (o reducer apenas valida formato), antes de aplicação no Draft. Identidade do usuário nunca é inferida apenas do brawler.

## Infraestrutura necessária antes de conectar aparelhos

- Criar tabelas de sessão, participação, snapshots versionados, eventos e auditoria; `team_id = auth.uid()` para RLS do coach.
- Implementar ingresso de jogador sem senha da equipe: códigos temporários trocados em **Edge Function** por credenciais efêmeras e escopo apenas daquela sala. Expirar, revogar, limitar tentativas; aprovação opcional do coach. Nunca compartilhar token do coach ou `service_role`.
- Realtime de sala **privada**, com autorização por participação individual. Política por equipe e sessão em `realtime.messages`; nunca usar canal público apenas com código de sala.
- Transporte de capturas com criptografia HTTPS/TLS, retenção curta, consentimento, rate limit e tamanho máximo. Preferir reconhecer localmente; não guardar imagens por padrão. Proteção para conteúdo de notificações pessoais capturadas na tela.
- Persistir evento com revisão de versão otimista e idempotência no servidor, para impedir que duas telas escrevam por cima da outra. Reconciliar desconexão e eventos fora de ordem.
- `MediaProjection` no Android; no iOS investigar e implementar permissões/limitações oficiais do ScreenCaptureKit em versões suportadas e fallback se a capacidade não estiver disponível. São integrações nativas, não simples funções do navegador.
- Criar testes com imagens reais e diversas resoluções/idiomas, sem declarar reconhecimento funcional antes da verificação.

## Integração com o Draft manual
Usar um adaptador controlado, observação por observação, para atualizar `DraftWizard`, preservando `onUndo`, validação de picks e controles manuais. Não salvar histórico de partidas automaticamente. A tela experimental não grava nada no Supabase.

## Dependências/segurança
Docs de referência: https://supabase.com/docs/guides/realtime/authorization e https://supabase.com/docs/guides/realtime/broadcast.
Não aplicar migrations no banco de produção nem registrar fotos antes de inspeção das políticas. O primeiro teste de multi-dispositivo depende dessa camada de autenticação, ainda pendente.


## Fase 2B: convite e aprovação de jogadores (implementado)

- Migração aplicada: `supabase/migrations/20261025021635_draft_auto_join_requests.sql`.
- `draft_auto_join_requests` armazena nome, estado e hash SHA-256 de um token aleatório (nunca o token).
- O coach vê apenas pedidos de suas salas e pode alterar somente `status` de pendente para aprovado/recusado.
- Endpoint público `draft-auto-join` oferece `request` e `status`; o token aleatório de 256 bits é mantido na guia do jogador via sessionStorage e necessário para consultar a resposta. A URL/código isolados não dão acesso às informações da equipe.
- Rota web de jogador: `/?draftJoin=CODIGO`, que não depende de login da equipe. Pode ser aberta em outra janela ou no celular.
- O coach recebe e responde solicitações, com atualização por polling de quatro segundos.
- Limites por sala (20 totais, seis pendentes) reduzem spam, mas **ainda é preciso reforçar rate-limiting externo por IP/dispositivo, monitoramento e revisão de origem antes de abrir para grande público**.
- **A aprovação não dá acesso ao Draft, imagens, estatísticas nem Supabase Realtime ainda.** Ela comprova apenas que o coach aceita aquele pedido. Na fase de sincronização, usaremos a credencial temporária validada na Edge Function para autorizar eventos da própria sala no servidor.
- Encerre a sala ou aguarde a expiração para invalidar o pedido. Não usar este token como JWT nem credencial de outras tabelas.
- Testar `http://localhost:3000/?draftJoin=CODIGO` em janela anônima. Para celular na mesma rede, substitua localhost pelo IP de rede mostrado pelo Vite.

## Fase 3A — Transmissão de eventos de teste (implementada)

- `supabase/migrations/20261025024951_draft_auto_events.sql`: eventos estruturados vinculados à sala e ao pedido aprovado, FK para mapa/brawler, idempotência por `request_id + client_event_id`, RLS de leitura exclusiva do coach e nenhum INSERT/UPDATE para clientes autenticados ou anônimos.
- `draft-auto-join` atualizado: endpoints `catalog` e `send-event` exigem token de jogador, estado `approved`, sala aberta e prazos válidos. Eventos **sempre manuais**: a tela não pode alegar origem de captura nem confiança reconhecida.
- O catálogo retornado ao jogador contém somente os nomes/IDs **globais** de mapas e brawlers; não inclui meta, dados de partidas, jogadores ou preferências de equipes.
- Limite inicial de 40 eventos por solicitação; consultar a seção anterior sobre limitações de rate limiting antes de lançar publicamente.
- Jogador aprovado consegue enviar mapa, lado do primeiro pick, ban e pick manualmente para testar transporte.
- Coach recebe uma lista de eventos da própria sala com atualização periódica a cada três segundos. **Não são aplicados automaticamente ao Draft Wizard ou ao Lab**, para prevenir contaminação de dados e incompatibilidades até termos confirmação e reconciliação.
- Para testar: conectar um jogador por código, aprovar, no jogador escolher `Mapa` e enviá-lo. O coach deverá vê-lo em `Eventos recebidos`. Testar também ban e pick. Encerre a sala e verifique que tentativas de envio são recusadas.
- Não existe captura real de tela nem API externa integrada. Próximas etapas: reconciliar observações com o reducer e Draft Wizard, capturar/identificar imagens com consentimento, proteger trânsito de imagens e produzir clientes móveis Android/iOS.

## Fase 3B — Aplicar eventos ao Draft com confirmação do coach

- A sala exibe `Revisar no Draft` para cada evento manual recebido. Ao clicar, navega à tela Draft, abre prévia e **exige confirmação explícita do coach**.
- `src/lib/draftAutoImport.ts` valida slots, ordem dos picks conforme first pick, duplicação, bans, mapa selecionado e conflitos com o rascunho existente. Não substitui informações divergentes silenciosamente.
- Os imports aceitos usam `setDraftStateWithHistory` do DraftWizard, mantendo o desfazer (Ctrl+Z) e os cálculos de recomendações existentes. O primeiro pick importado muda para a etapa de picks. Nunca salva treino/resultado automaticamente.
- Em caso de conflito, a prévia explica o motivo e exige correção manual ou limpeza do Draft; não aplica um evento inválido.
- Ao sair da conta ou entrar numa equipe diferente, a pendência na interface é descartada.
- **Este é um ponto de confirmação manual intermediário**, não o resultado final de atualização automática por reconhecimento visual. Falta reconciliar sessões e eventos simultâneos e autorização robusta para ingestão automática de fontes externas.
- Testes: `src/__tests__/draftAutoImport.test.ts` incluem mapa, bans duplicados, pick fora de sequência, equipe incorreta e brawler banido.

Teste prático: no coach, ver evento recebido e clicar **Revisar no Draft**; conferir mensagem/identidade e clicar **Confirmar no Draft**. O mapa deve atualizar e as recomendações da tela de mapa devem recalcular. Eventos contraditórios devem ser recusados. Se houver draft anterior salvo, use `Limpar Draft` somente após decidir que pode perder esse rascunho.

## Fase 3C — Fila contínua de eventos no Draft (implementada)

**Problema reproduzido pelo usuário:** dois bans enviados em sequência antes de confirmar o primeiro; o segundo era salvo no Supabase, mas só aparecia após voltar manualmente à sala e clicar em `Revisar no Draft`. A tela do Draft aguardava um único `incomingEvent`, sem buscar novos eventos.

**Solução:**
- Banco guarda `draft_auto_events.review_status`: `pending`, `applied`, `dismissed`, inicialmente `pending` para eventos existentes (migração `20261025033953_draft_auto_event_reviews.sql`).
- RLS + GRANT restrito: somente coach da equipe atualiza a coluna `review_status`; nenhum cliente modifica payload original. Dados de outras equipes e acesso anônimo continuam inacessíveis.
- `App` consulta periodicamente salas ativas e **todos os eventos pendentes** (inclusive os novos enquanto Draft aberto), deduplica e ordena cronologicamente. A fila mostra contagem e controles **Anterior**/**Próximo**.
- Confirmar ou descartar salva a decisão no Supabase, retira o evento da fila e mostra automaticamente o próximo, sem sair da tela do Draft.
- `ignored` (informação já registrada) pode ser marcado como revisado. Um conflito mantém o evento pendente e exige correção humana ou descarte.
- `DraftAutoRoomEvents` mostra estados pendente/confirmado/descartado e impede clicar novamente em eventos finalizados.
- Confirmação utiliza o importador puro e o histórico de desfazer existente; nenhum evento grava um treino/resultado ou substitui silenciosamente picks/bans conflitantes.
- Testes regressivos de fila: dois bans em sequência, eventos processados, duplicações e navegação circular.
- Permanece **polling** a cada três segundos, sujeito a atrasos e à conexão do coach; não é captura/identificação do jogo nem WebSocket de baixa latência.

**Validação manual:** enviar mapa e depois dois bans da mesma equipe em slots 1 e 2 sem navegar para outra página. No Draft, confirmar o primeiro e verificar que o segundo surge imediatamente. Testar anterior/próximo, conflito, evento repetido e um ban que chega enquanto o Draft já está aberto. Verificar que a decisão persiste após atualizar a página. Usar sala nova, se a anterior expirou.

## Fase 4A — Capturas de imagem locais com consentimento (implementada)

- Jogador aprovado vê **Captura de imagem — teste local**, abaixo do envio manual.
- Pode selecionar um screenshot PNG/JPEG/WebP existente no celular ou computador (até 10 MB).
- No computador, se `navigator.mediaDevices.getDisplayMedia` estiver disponível, pode solicitar explicitamente ao navegador para compartilhar uma janela/tela, capturar **um quadro** e interromper as trilhas imediatamente. A permissão não é persistente, e o browser decide a origem compartilhada.
- A imagem é validada localmente por tipo de arquivo, tamanho, largura/altura e megapixels. Pode visualizar imagem completa e preparar recortes superior/central/inferior.
- URLs são locais (`blob:`) e revogadas na troca ou saída da tela; nada é salvo em Supabase, localStorage ou histórico de treinos. Nenhum arquivo chega ao coach nesta fase.
- Reconhecimento automático de personagens/mapas **não existe**: o sistema não tem capturas reais de draft rotuladas nem modelo calibrado. Os recortes da interface são manuais e **não representam detecção**.
- Em navegador móvel não é confiável capturar a tela de outro aplicativo usando `getDisplayMedia`; o usuário escolhe uma captura já salva. Para captura contínua enquanto o Brawl Stars está em primeiro plano, construir aplicativo nativo com permissões do sistema operacional (Android MediaProjection / frameworks nativos do iOS), com botão de parar, indicador e consentimento.
- **Próxima decisão técnica:** depois de obter capturas reais de mapa, bans e picks em pelo menos algumas resoluções, projetar extrator local e medição de confiança com revisão; só depois habilitar envio protegido ao coach. A integração deve reutilizar a fila de eventos e não registrar dados fictícios.

Teste: abrir página de jogador aprovado (em janela separada), procurar Captura de imagem, selecionar uma screenshot e verificar dimensões e recortes. No desktop também testar captura de janela com permissão. Verificar que nenhum evento de foto novo é gravado no Supabase.

## Fase 4B — Primeira identificação visual experimental (implementada)

### Amostras fornecidas pelo mantenedor (NÃO armazenadas no repositório)
O usuário forneceu capturas rotuladas de:
1. Tela de cara ou coroa (ainda sem resultado); 2. Vermelho começa;
3. Azul começa; 4. Ban pré-selecionado; 5. Ban confirmado;
6. Pick aliado pré-selecionado; 7. Pick aliado confirmado;
8. Pick inimigo confirmado; 9 e 10. Pré-seleção aliada deixa de existir quando o inimigo escolhe o mesmo brawler;
11. Preparação final após seis picks.
Também foram compartilhados exemplos de seleções simultâneas e duplicadas (que NÃO equivalem a picks/bans confirmados). Capturas vieram de vídeos e algumas telas incluem bordas pretas, marca d'água e conteúdo sobreposto.
Não publicar/copiar essas imagens para GitHub, nem tratá-las como dados de treino com direito de redistribuição.

### Detector entregue
- Módulo puro `src/lib/draftAutoVision.ts`: analisa apenas píxeis de duas regiões normalizadas da captura (`23%–68%` da largura; faixa central `34%–44%` da altura, referência `22%–28%` da altura). Usa limiares conservadores de vermelho e azul para identificar uma faixa grande e distinta da parte superior.
- **Suporte restrito ao anúncio do primeiro pick**: retorno `first-pick-announcement` com cor `blue` ou `red` ou `unknown` se não houver evidência suficiente. Não lê texto, não usa API de IA nem reconhece mapa, bans/picks, classes ou jogadores.
- Validação exploratória das capturas enviadas: exemplos `RED TEAM STARTS` e `BLUE TEAM STARTS` apresentaram faixa central forte com região superior neutra; imagens de `COIN FLIP` e de picks/preparação não satisfizeram os mesmos critérios. Não há medição de precisão estatística — amostras pequenas, formato específico.
- UI `DraftAutoVisionPreview` abre automaticamente após upload/recorte original de screenshot no laboratório **local** do jogador aprovado, sem enviar foto ao Supabase.
- Mesmo quando encontra uma faixa, exige que o jogador selecione manualmente `Sou azul` ou `Sou vermelho` antes de converter para `allyStarts`. O botão explícito `Confirmar e enviar ao coach` usa o canal já validado de evento manual `first-pick`, seguido da **revisão humana no Draft**. Não transmite evento apenas pelo fato de detectar pixels.
- O resultado não usa palavra `confiança` em porcentagens como se houvesse avaliação de modelo; a interface mostra só estatísticas observáveis de cor na área.
- Testes sintéticos cobrem faixa vermelha, azul, moeda neutra, tela com fundo todo vermelho/azul e input inválido.

### Próximos marcos
1. Capturar/rotular com autorização modelos de ícones de **ban confirmado** e **pick confirmado** (marcação de bloqueio / ✓) em diferentes proporções e idiomas. Pré-seleção jamais deve ser enviada.
2. Identificar brawler somente após template/matching comprovado em screenshots independentes (não treinar nem inferir a partir de nomes ou taxas de vitória).
3. Rastrear mudanças em sequência temporal e deduplicar decisões, separando `observado` de `confirmado`.
4. Reutilizar fila existente do coach para apresentar sugestões visuais verificadas. Envio contínuo da tela do celular requer captura nativa com consentimento explícito e segurança adicional.

### Teste inicial sugerido
Depois de atualizar a branch, entrar como jogador aprovado e usar `Captura de imagem — teste local`. Carregar primeiro a screenshot rotulada `BLUE TEAM STARTS` ou `RED TEAM STARTS`, observar o anúncio de cor, selecionar manualmente sua equipe na tela e clicar para enviar. Confirmar no Draft do coach. Repetir com `COIN FLIP`: deverá retornar "padrão não identificado" e **não** oferecer envio automático.
