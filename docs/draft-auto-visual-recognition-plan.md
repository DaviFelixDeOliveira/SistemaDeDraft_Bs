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


## Ajuste após novos testes reais — telas de duração diferente e dispositivos (25/10/2026)

**Observação do usuário:** depois do último pick, a tela de seleção completa aparece por menos de um segundo e passa à **Preparação Final**. Na preparação final, os seis cartões ficam **maiores e mais acima**, com as equipes lado a lado; os bans laterais desaparecem. A calibração antiga de faixa inferior exigiu largura ~91%, deslocamento lateral no máximo e altura ~77%, e não cobriu bem os personagens, especialmente em vídeo com margens pretas.

**Implementação nesta etapa**
- `src/lib/draftAutoScene.ts`: separa `selection` e `final-preparation`; propostas de retângulos diferentes em cada fase. Na preparação final **não exibe áreas de bans**; mostra somente seis cartões.
- `estimateDraftGameViewport`: varredura conservadora de cor/saturação para estimar **margens laterais escuras** do jogo dentro da captura. Recorre à imagem completa se não houver evidência; não é detector infalível de bordas, cartas, fase ou personagem. Dados processados localmente.
- `DraftAutoSlotLocatorLab`: permite selecionar manualmente a fase, usar a proposta de viewport automático ou calibrar a área visível e ajustar verticalmente as regiões. Continua apenas diagnóstico e não envia eventos.
- `draftAutoScene.test.ts`: testes de letterbox, quadro preenchido, imagem escura/inválida, layouts de seleção/preparação e regiões dentro da viewport.
- **Limitação expressa:** mesmo relativos à área estimada do jogo, os cartões continuam usando aproximações geométricas. Para dispositivos diferentes, o produto **precisará localizar as cartas visualmente** (bordas/contraste/landmarks ou detector comprovado), sem depender de posições absolutas/presets; confiança baixa deve resultar em ausência de evento, não em pick inventado.

**Lógica futura de sincronização:** capturar/observar banners, bans e picks **durante** a partida com intervalo suficientemente curto, pois a tela de transição dura menos de 1 s. A preparação final será uma boa fonte para **reconciliar os seis personagens confirmados** ao final, mas não permitirá reconstruir a hora exata nem a ordem das escolhas, nem ajudará no momento em que ainda precisamos sugerir um counter. O smartphone precisará de captura autorizada e um pipeline temporal, não somente screenshots manuais.

**Como verificar:** carregar como jogador aprovado uma screenshot completa da **Preparação Final**, selecionar explicitamente essa fase e verificar seis caixas na parte central, nenhuma caixa de ban; repetir com captura durante picks e selecionar a fase correspondente. Em vídeo com barras laterais, conferir a proposta automática de viewport; caso errado, usar o fallback manual e reportar. Não associar ícone verde a personagem até reconhecer identidade validada.


## Registro de validação da divisão de equipes e comparação temporal — 25/10/2026

Usuário enviou screenshot do laboratório com:
- viewport calculado automaticamente com **81% de largura**, início **9%** no quadro;
- divisão azul/vermelha calculada em **52%**;
- seis cartões A1/A2/A3/V1/V2/V3 visualmente próximos das respectivas cartas;
- ajuste vertical manual residual de **+2%**, provando que a posição ainda é apenas aproximada.

**Novo incremento** (diagnóstico de mudanças temporais, ainda sem reconhecimento de brawlers):
- `src/lib/draftAutoSlotChange.ts`: compara pixels da região central de **um mesmo slot** em duas imagens, produz fração e intensidade da diferença e uma indicação heurística de alteração relevante. Ignora partes do topo/rodapé onde ficam ícones, nomes e equipamentos. **Não consegue sozinho detectar transição de pré-seleção para confirmação**; marcador visual e identidade necessitarão detectores próprios.
- `src/__tests__/draftAutoSlotChange.test.ts`: casos de imagem idêntica, personagem diferente, mudança só no rodapé, ruído pontual e dados inválidos.
- `src/components/draftAuto/DraftAutoSlotChangeLab.tsx`: o usuário seleciona uma **segunda screenshot** da mesma partida/fase, o sistema aplica exatamente a mesma geometria de slots às duas imagens de proporção compatível e indica quais retratos variaram. Se quatro ou mais diferirem, avisa que não dá para inferir a ordem. Os arquivos ficam somente no navegador.
- `DraftAutoSlotLocatorLab.tsx`: inclui esse comparador depois do painel de localização.

**Segurança e limitações:** mudanças em cartões não são necessariamente picks. Animações, overlays, pré-seleção, quadros de partidas diferentes e deslocamento podem gerar falsos positivos. Um pick confirmado pode alterar apenas o check verde, que é ignorado pelo comparador central. Portanto esta etapa não cria nem transmite eventos e não atualiza draft nem banco de dados. A conferência visual do usuário nos próximos testes é indispensável.

**Verificação manual recomendada:**
1. Enviar print A do draft (antes de um personagem ser escolhido).
2. No mesmo tipo de tela e jogo, enviar print B do mesmo momento alguns segundos depois, com um slot de personagem diferente.
3. Usar o novo bloco `Comparar duas capturas — alteração de slots`; confirmar destaque no slot modificado. Capturas idênticas devem marcar 0 alterações.
4. Comparar uma pré-seleção que virou confirmação sem mudança de personagem: o comparador **pode não sinalizar**, comportamento esperado até integrarmos a análise do check verde.
5. Relatar falsos positivos especialmente quando a câmera/stream mudou o tamanho, as bordas ou houve animação; não usar diferenças visuais isoladas como confirmação.


## Validação de duas capturas e indícios de mudança de marcador — 25/10/2026

O usuário comparou duas imagens reais da mesma fase de draft. O laboratório identificou **1/6 slots alterados**, especificamente **Azul 3 = 59%** de pixels internos diferentes. Azul 1 = 3%, Azul 2 = 1% e três vermelhos = 0%. Conforme as imagens do usuário, essa saída é coerente; **não comprova pick confirmado**, apenas mudança do conteúdo visual desse slot.

Neste incremento:
- `src/lib/draftAutoSlotTemporal.ts`: interpretação conservadora de **duas fontes independentes** (mudança do retrato e possível marcador de confirmação), classificando diferenças no retrato, aparecimento/sumiço de indícios de ícones, conflitos e imagens indisponíveis. Cada caso mantém `requiresReview: true`.
- `src/__tests__/draftAutoSlotTemporal.test.ts`: teste de casos positivo/negativo, incluindo imagem modificada sem marcador, check surgindo sem troca de retrato, marcador desaparecendo e tipos conflitantes.
- `DraftAutoSlotChangeLab.tsx`: na comparação das imagens, lê também recortes em resolução mais alta para indicar possíveis transições dos marcadores **separadamente** da diferença de retratos; sem enviar eventos ao coach.

**Validação necessária no dispositivo:** escolher duas capturas da mesma partida, fase, enquadramento e orientação. Testar um retrato que mudou, o mesmo retrato que ganhou ✓ verde (sem mudar brawler), o desaparecimento de um retrato e duas capturas idênticas. A heurística de ícones ainda pode errar quando a caixa do slot não está precisamente ajustada. O sistema não classifica como escolha confirmada nem envia nada automaticamente. Próxima fase requer identificação de brawler, detecção de carta/captura corretamente alinhada, fase e reconciliação de eventos sem duplicação.


## Correção de falso negativo de check em foto completa (25/10/2026)

**Defeito reproduzido**: duas capturas completas de uma mesma partida mostram o slot **Azul 1** ganhar ✓ verde, o **Azul 3** perder uma pré-seleção e ficar vazio, e os demais slots sem alteração importante. O comparador antigo informou apenas **Azul 3 = 71% do retrato alterado**; ignorou a confirmação em Azul 1 porque o check está parcialmente **fora do limite direito da carta** e a heurística anterior verificava uma janela interna do recorte.

**Novo detector conservador**:
- `src/lib/draftAutoGreenCheck.ts`: define uma região adjacente direita/inferior de **cada slot de pick** (x = 78% até 140% da largura do retângulo estimado do cartão, y = 52% até 86% da altura), adaptada às coordenadas normalizadas do quadro.
- Compara máscaras de pixels verde intenso entre as imagens **antes e depois**, procura um novo componente conexo compacto (tamanho, razão de lados, densidade e proporção de novidade) e emite somente `possible-check-appeared`, `no-new-check` ou `unavailable`.
- `src/components/draftAuto/DraftAutoSlotChangeLab.tsx`: exibe separadamente a contagem de possíveis checks verdes surgidos e a contagem de retratos alterados. Não transforma automaticamente ícone detectado em pick.
- `src/__tests__/draftAutoGreenCheck.test.ts`: testes de check novo, check antigo persistente, bloco verde não parecido com check, ruído, desaparecimento e recorte inválido.

**Verificação local das capturas reais** (fora do repositório, sem upload de imagens à API): aplicando a geometria de teste usada no browser (viewport aproximada 82% começando em 9%, deslocamento vertical +2%) à dupla de imagens fornecidas, a nova região de Azul 1 apresentou **6,84% de pixels verdes novos**, com componente compatível com check; as demais cinco regiões **0%** de pixels verdes novos nessa amostra. Esta verificação foi realizada em uma comparação independente de pixels das imagens fornecidas, não substitui teste de integração do algoritmo TypeScript no navegador. Não incluir exemplos externos/frames de vídeo como fixtures sem autorização.

**Revalidação necessária**: atualizar branch, abrir a mesma dupla de capturas e verificar **1 indício de check verde novo em Azul 1**, em paralelo com **1 retrato alterado no Azul 3**, sem outras confirmações. Capturas iguais devem retornar zero checks novos; check que já estava presente antes também deve retornar zero novos. Regiões deslocadas, skins e UI animada podem gerar resultados falsos e exigirão futura detecção geométrica das cartas.


## Protótipo de identificação visual por referências nomeadas (25/10/2026, incremento seguinte)

Objetivo: avançar do **detectar que um retrato mudou** para **comparar sua aparência com exemplos humanos conhecidos**, sem afirmar que o catálogo completo de brawlers foi aprendido.

- `src/lib/draftAutoPortraitIdentity.ts`: extrai assinatura RGB 8x8 (192 valores) do centro do retrato, evitando nome do player, acessórios e ícones de confirmação. Avalia a semelhança entre capturas com geometria alinhada.
- `matchDraftPortrait` só exibe `similar-example` se houver referências rotuladas manualmente de **dois nomes diferentes**, semelhança **>= 90%** e distância de **>= 8 pontos percentuais** em relação ao segundo nome mais próximo. Em outros casos, **não atribui nome**.
- `src/__tests__/draftAutoPortraitIdentity.test.ts`: assinaturas válidas/inválidas, identidade exata, variação de cor pequena, mínimo de referências, exemplos ambíguos e alvo desconhecido.
- `DraftAutoPortraitReferenceLab`: dentro de `Comparar duas capturas`, o usuário escolhe o slot da **primeira screenshot**, informa o nome do brawler que ele mesmo viu e adiciona um exemplo temporário. O sistema compara esses exemplos com os seis slots da **segunda screenshot** e mostra apenas possíveis semelhanças. As referências ficam em memória no navegador, sem Supabase, sem API, sem persistência e sem enviar eventos. Um novo frame base ou ajuste na geometria limpa referências para evitar mistura de partidas/enquadramentos.

**Limitações deliberadas:** o nome vem do usuário, não de uma inteligência artificial. A aplicação ainda NÃO classifica os 108 brawlers; não reconhece skins arbitrárias, cartas fora de posição, itens encobrindo o rosto nem mudança de fases; diferenças fortes podem resultar em `uncertain`. Assinaturas visuais de recortes idênticos podem ser falsas coincidências. Nenhuma sugestão de brawler deve ser aplicada automaticamente a picks/bans. A fase posterior precisará de uma base de imagens etiquetadas e autorizadas (incluindo skins), detecção visual real dos cartões, testes de precisão/taxa de abstenção com amostras independentes e mapeamento oficial dos nomes aos UUIDs do catálogo.

**Teste manual recomendado:** carregar duas screenshots com a **mesma geometria** (as duas imagens previamente usadas com Azul 1 confirmado e Azul 3 esvaziado servem); após comparar, cadastrar na primeira captura pelo menos dois exemplos de brawlers que sejam visíveis, incluindo Azul 1 e Azul 2. O protótipo deverá reconhecer aparência similar nas mesmas posições da segunda captura, enquanto Azul 3 vazio deverá aparecer sem correspondência segura; testar também um par de referências visualmente similares para confirmar abstenção. Não fazer deploy nem enviar eventos ao coach com base nos resultados deste laboratório.

**Verificação local adicional de marcador:** as duas imagens originais do usuário (`image(20261025-185426).png` e `image(20261025-185620).png`) foram inspecionadas via script transitório fora do repositório, com viewport x~9%, largura~82%, deslocamento y+2%. ROI de Azul 1 apresentou ~6,5% de pixels verdes novos e uma componente conexa compatível com check (440 px, densidade ~0,40); Azul 2, Azul 3 e vermelhos não tiveram novo componente nessa calibração. O algoritmo TypeScript e CI passaram; a etapa de teste **no navegador real ainda deve ser confirmada pelo usuário**, pois comparação offline não substitui integração UI.


## Catálogo visual público sem cadastro manual durante cada treino (26/10/2026)

**Contexto:** teste anterior validou dois nomes informados pelo usuário (Lumi em Azul 1: semelhança 97%; Meg em Azul 2: 93%; Azul 3 vazio e demais slots sem referência). Esses percentuais são medidas de similaridade do protótipo, NÃO precisão estatística.

**Implementado na branch de desenvolvimento:**
- `src/lib/draftAutoCatalogVisual.ts` valida entradas de `https://api.brawlapi.com/v1/brawlers`, exigindo IDs numéricos de brawler e URLs estritamente `https://cdn.brawlify.com/brawlers/(borderless|borders)/<id>.png` que correspondam ao próprio ID. Restringe a 160 registros e remove duplicatas.
- `src/components/draftAuto/DraftAutoCatalogRecognitionLab.tsx`: seção opcional **Identificação pelo catálogo — sem cadastrar nomes**, dentro da página experimental do jogador após selecionar duas capturas. Ao clicar **Carregar catálogo visual**, busca metadados públicos, carrega imagens com `crossOrigin='anonymous'` usando até 6 operações concorrentes, gera assinaturas RGB temporárias e compara com seis slots. Informa quantidade carregada, falhas e abstém-se em casos incertos. Se o CDN não permitir leitura de pixels por CORS, a operação falha explicitamente, sem contornar a proteção.
- O marcador `possible-match` exige >=90% de semelhança visual RGB e separação de >=8 pontos percentuais frente ao segundo mais parecido; mostra indicação não validada, nunca um pick confirmado. Mesmo o melhor vizinho exibido em diagnóstico NÃO é identificação suficiente.
- `src/__tests__/draftAutoCatalogVisual.test.ts`: bloqueio de URL arbitrária, validação do ID, duplicatas, ausência de referências e margem de separação.
- A base NÃO precisa de conta no Supabase, senha, captura enviada ou digitação manual de nomes. Imagens do catálogo são baixadas diretamente do CDN. Somente a API de metadados é consultada; o print do usuário permanece no próprio navegador.

**Cautela essencial:** as imagens públicas de catálogo (ícones padrão) **podem ser visualmente muito diferentes dos retratos do draft e de skins**; o algoritmo RGB é apenas um experimento e provavelmente poderá retornar "Sem identificação segura" para muitos ou todos os slots. Isso não prova que o brawler não existe. Ainda NÃO é classificador validado de todos os personagens, não estima confiança estatística e não preenche eventos. Próximos passos: uma coleção de imagens comparáveis ao draft (com fontes/autorização adequadas), testes independentes com skins/idiomas/resoluções; detector de slots vazios; distinção de estado/semana/partida; identidade de cada jogador e vínculo ao UUID do banco.

**Como validar:** Atualizar `feat/draft-auto-foundation`, abrir link vigente do jogador com sala aprovada, carregar duas imagens da mesma partida/fase, rolar abaixo de `Comparar duas capturas` para `Identificação pelo catálogo — sem cadastrar nomes`, clicar `Carregar catálogo visual` e observar contagem de referências utilizáveis e resultados Azul/Vermelho. Enviar print com quantas imagens foram carregadas e quais brawlers foram identificados/abstidos. Se 0 imagens por CORS, documentar erro e não improvisar proxy com privilégios.
