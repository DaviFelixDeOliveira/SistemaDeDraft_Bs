# Plano de implementação — reconhecimento visual de bans e picks (modo treino)

## Objetivo
O jogador joga Brawl Stars em seu aparelho e acompanha o Draft Automático; um coach (ou o próprio jogador) recebe informações estruturadas de mapa, lado, bans e picks **confirmados** rapidamente, sem cadastrar duas vezes os mesmos acontecimentos. O produto é voltado principalmente a treinos, não depende de plataformas de torneio.

## Situação do código em 25/10/2026
- `src/lib/draftAutoVision.ts`: detector experimental da faixa de anúncio vermelho/azul, já testado manualmente pelo usuário.
- `src/components/draftAuto/DraftAutoCaptureLab.tsx`: captura local por upload ou quadro de janela compartilhada no desktop; **não é captura contínua do jogo em segundo plano no celular**.
- `src/services/draftAutoGuestService.ts`: autorização do jogador e envio manual dos eventos estruturados pelo backend Supabase.
- `src/lib/draftAutoImport.ts` + `DraftWizard.tsx`: coach revisa antes de aplicar; conserva histórico desfazer e não grava partida fictícia.
- `src/lib/draftAutoProtocol.ts`: ordem snake draft, identidade e antirrepetição.
- `src/lib/draftAutoVisualEvidence.ts` (**novo**): detecta **apenas indícios da cor de um ícone** no canto inferior direito de um **recorte de UM slot**. Não identifica brawler, slot, equipe ou fase, nem envia eventos. `src/components/draftAuto/DraftAutoVisualMarkerLab.tsx` permite experimentar com recortes individuais sem upload ao servidor.

## Estados visuais que precisamos representar
| Fase | Indicadores observáveis | Tratamento |
|---|---|---|
| Mapa | Nome do modo/mapa no alto à esquerda | Reconhecer texto/ícone e conferir ID do catálogo; revisar em caso de dúvida |
| Cara ou coroa | Animação antes do resultado | Não gerar `first-pick` |
| Quem começa | Faixa `BLUE/RED TEAM STARTS` ou português | Relacionar azul/vermelho à nossa equipe confirmada antes de enviar |
| Ban pré-selecionado | Retrato sem bloqueio de confirmação no slot | Estado auxiliar somente, nunca ban |
| Ban confirmado | Slot e ícone de proibição vermelho | Só enviar após reconhecer personagem, equipe e posição; possível ban igual no time adversário |
| Pick pré-selecionado | Retrato de nossa equipe sem ✓ verde | Estado auxiliar, nunca pick |
| Pick confirmado | Retrato do slot com ✓ verde | Exigir personagem reconhecido, equipe, slot e ordem geral coerente |
| Inimigo tomou nossa pré-seleção | Ícone verde no inimigo; o aliado volta a vazio | Limpar pré-seleção, importar só a escolha inimiga |
| Preparação final | Tela dos seis picks e preparação | Encerrar coleta de novos bans/picks neste draft; builds ficam fora do escopo |

**Distinções críticas**: o mesmo ban pode aparecer temporariamente em vários slots da mesma equipe; somente o confirmado entra no histórico. Equipes opostas podem banir o mesmo personagem em seus próprios slots. Vários aliados podem pré-selecionar o mesmo brawler; isso não confirma nem duplica picks. Não presumir que azul é aliado em toda partida. O índice físico do slot inferior de um jogador NÃO equivale automaticamente ao índice global do snake draft (0..5).

## Etapa A — localizar a área verdadeira do jogo
1. Detectar viewport da partida e descartar barras pretas, bordas, overlays de live e webcams. Em imagens parcialmente cobertas, retornar `unknown` quando os marcadores não estiverem visíveis.
2. Usar coordenadas **normalizadas ao viewport do jogo**, não pixels absolutos de 1920×1080, e testes com 16:9 e outras proporções.
3. Localizar os três slots de cada time na faixa inferior e seis pequenos slots laterais de bans. Tratar a ordem esquerda/direita e a região de HUD de maneira separada.
4. Oferecer painel de inspeção com desenho das regiões detectadas, para calibração sem eventos enviados.

**Aceitação A:** indicar corretamente regiões em um conjunto separado de capturas reais e abster-se quando a posição não é confiável.

## Etapa B — confirmar ou descartar marcador de estado
1. Para cada slot **já localizado**, inspecionar ícone de ban vermelho/✓ verde no local esperado.
2. `src/lib/draftAutoVisualEvidence.ts` é **apenas ponto de partida** para recortes, não classificador comprovado. Substituir/fortalecer com detecção de formas/templates dos ícones e testes em fundos coloridos e skins diversas.
3. `none/unknown` não equivale automaticamente a `preselected`; só significa que não há evidência suficiente de confirmação.
4. Exigir consistência visual entre dois quadros próximos **quando captura contínua estiver disponível**; para screenshot avulso, só apresentar sugestão para confirmação.

**Aceitação B:** nunca transformar pré-seleção ou retrato provisório em decisão confirmada nos casos negativos fornecidos. Registrar matriz de erros em amostras não usadas na calibração.

## Etapa C — reconhecer a identidade do brawler
1. Separar o retrato do personagem das bordas, nomes de jogador, gadget/engrenagem e skin.
2. Construir referências visuais de retratos com permissão e versões de catálogo, sem republicar frames do YouTube no GitHub.
3. Comparar usando abordagem incremental (templates/embedding local calibrado). Não confiar apenas nas cores nem deduzir personagem por winrate.
4. Para caso ambíguo, retornar lista de candidatos ou `unknown` e solicitar confirmação de coach/jogador.
5. Validar ID resultante no catálogo global de brawlers.

**Aceitação C:** reconhecer personagem em imagens de validação independentes; recusar baixa qualidade/skins não reconhecidas em vez de inventar um nome.

## Etapa D — reconstruir sequência e integrar
1. Montar observação visual com `session, timestamp, phase, viewport, teamColour, physicalSlot, characterCandidate, confirmationMarker`.
2. Traduzir azul/vermelho para aliado/inimigo **somente** após jogador confirmar lado.
3. Distinguir o `slot` físico dentro do time e o `slot` global snake draft; reconstruir sequência por decisões confirmadas.
4. Comparar snapshots anteriores para emitir apenas transições válidas. Armazenar `eventId` estável para deduplicar retransmissões, mais versão da sala.
5. Não enviar uma decisão usando só o marcador cromático; exigir identidade, estado confirmado, equipe/slot e fase.
6. Usar o canal existente de `draft-auto-join` e fila do coach; confirmação do coach enquanto o detector não for calibrado.
7. Eventos conflitantes passam para `review` no `DraftWizard`; nunca sobrescrever manualmente de forma silenciosa. Nada deve gravar treino ou partida sem ação explícita.

**Aceitação D:** dois bans consecutivos não se perdem; repetir frames não duplica picks; ordem snake válida, bans iguais de lados opostos suportados; corrigir dados manualmente não é revertido por screenshot desatualizado.

## Etapa E — captura utilizável durante treinos
- Desktop: testar captura de janela com permissão explícita e parada clara; não capturar silenciosamente outras telas.
- Android: estudar implementação nativa usando API de captura do SO com consentimento revogável e indicador visível. Jogo em primeiro plano, outro aparelho para coach. Energia, latência e redes móveis fazem parte dos testes.
- iOS: avaliar permissões e limitações de captura/broadcast nativo e testar em aparelhos de colegas; não prometer paridade antes dessa validação.
- Evitar transmitir imagens privadas por padrão. Preferir extrair eventos no próprio dispositivo, enviar somente dados necessários, proteger autorização/token e restringir sala/equipe.

## Ordem de entregas pequenas
1. **Feito neste incremento:** `draftAutoVisualEvidence` + teste de ícones em recortes individuais, sem envio.
2. Localização da faixa inferior e dos slots em screenshot completo.
3. Classificador seguro de estados confirmado/provisório por slot.
4. Identificação confiável dos brawlers.
5. Reconciliação dos snapshots e integração da fila.
6. Captura móvel nativa com consentimento e testes reais.

## Como verificar a fase atual
1. Na branch `feat/draft-auto-foundation` abrir sala e aprovar um jogador.
2. Na página do jogador, localizar **Captura de imagem — teste local** e depois **Laboratório de ícones confirmados — teste isolado**.
3. Selecionar **um recorte completo de um slot**, como as imagens de exemplo fornecidas anteriormente: ban confirmado, ban pré-selecionado, pick confirmado, pick pré-selecionado.
4. Esperado: ícone vermelho gera **possível ban**, check verde gera **possível pick**, sem marcadores retorna `unknown`. Nenhum resultado desse diagnóstico é enviado ao coach.
5. Reportar erros com a imagem usada; cor isolada sem formato ainda pode confundir o detector experimental. Testes automatizados não substituem validação no dispositivo.

**Restrições**: não fazer merge em `main` até testes visuais; não armazenar/publicar prints de stream no repositório; nenhum recurso deve chamar o diagnóstico de ícone de “reconhecimento completo do brawler”.

## Regressão encontrada com quatro screenshots reais (25/10/2026)

Ao rodar o primeiro filtro de cor sobre quatro screenshots individuais fornecidos pelo usuário, os resultados foram:
- Ban confirmado: marcador `ban` (esperado)
- Ban não confirmado: `unknown` (esperado)
- Pick confirmado: marcador `pick` (esperado)
- Pick pré-selecionado: marcador `ban` (FALSO POSITIVO devido aos pixels vermelhos do retrato)

Foi adicionada a heurística `hasCompactRedBanShape` que busca uma componente vermelha **compacta e aproximadamente circular**, na região inferior direita do slot, em vez de confiar só na área ocupada pela cor. Um teste sintético extra garante que manchas vermelhas grandes e não circulares não gerem ban. O pipeline de TypeScript, Vitest e build passou. **Os quatro screenshots reais ainda precisam ser revalidados no browser contra esta alteração**, porque a heurística não é modelo treinado nem validação estatística.

Até validar isso em diferentes skins, regiões, resoluções e overlays, não usar esta classificação para criar ou enviar bans/picks automaticamente. Diferenciar identificação visual de marcador, identidade do brawler, time e posição do turno.


## Incremento implementado: localizador de slots em screenshot completo (25/10/2026)

- Novo `src/lib/draftAutoLayout.ts`: propõe geometria normalizada para **6 cartas grandes inferiores de picks** (3 azuis, 3 vermelhas) e **2 áreas de bans laterais**. O índice do slot é físico dentro da cor da equipe, **não** a ordem global snake.
- Novo `src/components/draftAuto/DraftAutoSlotLocatorLab.tsx`: sobrepõe regiões na screenshot integral enviada no laboratório do jogador e mostra miniatura/diagnóstico da região selecionada. Permite **calibrar manualmente** largura central do jogo, deslocamento horizontal (barras de vídeo) e altura das cartas; essas posições são heurísticas geométricas, não detecção automática de carta.
- Novo `src/__tests__/draftAutoLayout.test.ts`: valida oito regiões, limites da imagem, separação de lados, calibração e entrada inválida.
- A etapa é **somente diagnóstica**, não grava frames, não envia eventos ao coach, não detecta personagem, não reconhece individualmente cada ban lateral e não sabe quem é aliado.
- Critério para a validação manual: carregar uma screenshot completa de pick com ambos os times visíveis; ajustar até as seis caixas cobrirem exatamente as cartas; clicar em cada caixa e verificar se a miniatura corresponde à posição. Alterar calibração para vídeo com tarjas pretas laterais e repetir. Se a posição não puder ser ajustada, relatar o exemplo para modelar outro layout.
- **Próxima etapa** após conferir caixas em telas de jogadores e streams: calibração dinâmica/identificação geométrica automática sem sliders, classificação de slots físicos e detector de identidade dos brawlers com abstinência em baixa confiança.
