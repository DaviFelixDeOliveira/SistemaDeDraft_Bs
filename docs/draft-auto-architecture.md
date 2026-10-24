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
