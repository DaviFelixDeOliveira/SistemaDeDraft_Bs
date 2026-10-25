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
