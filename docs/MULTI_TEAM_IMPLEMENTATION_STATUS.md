# Sistema de Draft — status real e plano de migração

Revisado em 23/10/2026 com base no relatório histórico do Antigravity e na inspeção da branch atual.

## O que o relatório documenta
O relatório descreve o sistema antigo para uma equipe: login por PIN em `LockScreen`, perfis Admin/Player, Draft Wizard, treinos (scrims), relatórios, dashboard, catálogos, backups JSON, atalhos e preferências. **É um retrato da versão anterior**, não o estado atual desta branch.

## Regras aprovadas para o Sistema de Draft v2
- Nome oficial do produto: **Sistema de Draft**, sem dependência da antiga equipe.
- Cadastro público de **uma conta por equipe**, com nome e senha; não pedir email na interface.
- Cada conta representa uma equipe; nenhuma distinção entre Admin e Player.
- Equipes compartilham o catálogo **somente de leitura** de brawlers e mapas, enquanto jogadores, drafts, partidas, treinos, estatísticas, tiers personalizados, mapas ativos e backups são privados.
- Brawlers existentes devem ser preservados, incluindo IDs/atributos especiais já curados.
- Dados históricos antigos podem ser descartados após salvaguarda; nunca apagar brawlers.
- Meta global como referência e meta adaptativo por equipe com taxa de vitória confiável, frequência de bans e picks, contexto de mapa/modo, counters e comfort picks.
- Backups exportáveis/restauráveis somente no escopo da equipe, com validação transacional.

## Status implementado nesta branch
- Identidade visual e texto neutralizados.
- Protótipo de login/cadastro por nome e senha conectado a Supabase Auth.
- PINs fixos e controle de permissão Admin/Player removidos da interface.
- Registro desabilitado por padrão: `VITE_ENABLE_TEAM_SIGNUP` não deve ser ativada ainda.
- UI de backup global ocultada até revisão; restauração antiga **não pode ser utilizada na versão multi-equipe**.
- Testes para nomes de equipes e manutenção da tradução `ally` (frontend) -> `nos` (banco).
- **`supabase/sql/team_isolation_PREVIEW.sql`** é um rascunho, NÃO uma migração aplicada.

## Riscos e lacunas bloqueantes
1. Supabase Auth documenta senhas associadas a email/telefone. O protótipo usa endereço interno sintético `@teams.sistema-de-draft.invalid`, **não validado em ambiente real**. Pode falhar na validação de email; não ativar cadastro antes de resolver e testar. Sem email não há recuperação padrão de senha.
2. As tabelas privadas estão sem isolamento e RLS da maioria delas está desabilitada no banco de produção. Não publicar o novo login enquanto isto persistir.
3. **O rascunho SQL exige a limpeza separada dos dados anteriores antes da aplicação**; é transacional e abortará se os dados existirem. Não o execute no banco de produção até os serviços/fluxo de autenticação estarem validados.
4. O catálogo global deve ter permissões read-only no browser; `brawlerService` e `mapService` ainda precisam ser adaptados para escrever apenas configurações por equipe.
5. Dashboard, histórico e motor de recomendação devem operar somente com resultados da equipe autenticada; testes de tentativas de leitura de outra equipe são obrigatórios.
6. Sessões, drafts e caches precisam utilizar chaves com ID da equipe; a limpeza provisória ao trocar de conta protege dados de vazamentos acidentais mas não implementa persistência plena por equipe.
7. Limpeza dos históricos, atualização automática de brawlers/mapas, melhorias de ranking e backup individual continuam pendentes.

## Ordem de trabalho segura
1. Garantir um snapshot de banco ou JSON válido; verificar integridade dos 106 brawlers antes e depois.
2. Validar credenciais e recuperação do nome+senha sem email, num ambiente de teste (não criar contas reais até RLS).
3. Preparar e aplicar esquema RLS em ambiente de teste, com dados legados já separados/removidos.
4. Adaptar todos os services e componentes aos IDs de equipe e às preferências individuais.
5. Testes end-to-end com equipe A, equipe B, logout, troca de navegador, sessão expirada, acesso anônimo, acesso cruzado e backups.
6. Implantação em produção por janela coordenada, com limpeza controlada de históricos antigos após confirmação explícita, preservando brawlers.
7. Sincronizar catálogo via API, ajustes de mapas e motor adaptativo, então liberar cadastro.

## Não interpretar como concluído
- `npm run lint`, `npm test` e `npm run build` provam tipagem, testes existentes e compilação; **não provam isolamento/RLS, funcionamento real de signup ou integração multi-equipes**.
- A lista de pendências do relatório inclui itens que podem ter sido implementados depois. Verificar cada um no código atual antes de abrir tarefas duplicadas.


## Atualização de implantação rápida — 23/10/2026

O banco de produção foi **efetivamente atualizado** mediante solicitação do proprietário para zerar dados antigos e disponibilizar o sistema. Esta atualização prevalece sobre trechos anteriores que digam que a migração não foi executada.

- Criado snapshot privado `archive.system_reset_snapshots` contendo brawlers, mapas, jogadores, partidas, picks, bans, treinos, composições e backup legado antes da exclusão.
- Preservados os **106 brawlers** e os **20 mapas**; resetados jogadores, partidas, picks, bans, treinos, composições e `latest_backup`.
- Criadas `teams`, `team_brawler_settings`, `team_map_settings`, vínculos `team_id`, constraints compostas, trigger `private.create_team_from_auth`, políticas RLS, grants e `security_invoker` para `brawler_winrate`.
- Confirmado que as tabelas privadas ficam inacessíveis à role `anon`; Supabase security advisors retornam zero alertas; verificadas 39 policies RLS.
- Frontend adaptado para consultar e gravar mapas e configurações de brawlers por equipe; corrigidos falso sucesso em gravações e restauração global desativada.
- **Ainda depende de verificação real:** provedor Supabase Email configurado com `Confirm email` desativado, aceitar endereços internos `@teams.sistema-de-draft.invalid`, criar duas equipes e verificar isolamento em navegador real.
- Cadastro no frontend continua dependendo de `VITE_ENABLE_TEAM_SIGNUP=true` no arquivo `.env.local` ou nas variáveis de hospedagem.
- O SQL `team_isolation_PREVIEW.sql` é um rascunho anterior, NÃO deve ser executado: a implantação real foi feita por transação via ferramenta Supabase e contém mudanças adicionais.
