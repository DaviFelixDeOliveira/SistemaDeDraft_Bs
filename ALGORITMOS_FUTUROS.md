# Algoritmos Futuros — TBK Hub

**Aviso:** Antes de fazer, debata sobre a ideia, e me diga como fará ela e se podemos fazer, se aprovado, implemente.

## ⚠️ Princípio geral (vale para todos os itens abaixo que envolvem "counter"/confronto)

Quando um algoritmo precisar saber se um brawler nosso "countera" ou "é counterado" por um brawler do inimigo, a prioridade é sempre:

1. **Dado real agregado de confronto** (brawler nosso vs. brawler inimigo, somando TODAS as partidas registradas, sem quebrar por mapa ou modo) — se existir amostra suficiente, esse dado manda mais que tier e mais que classe (Algoz/Controle/etc.). Exemplo real: mesmo Starr Nova sendo Tier S e Stu Tier A, se a maioria das partidas em que pegamos Starr Nova contra Stu foi derrota, o sistema deve entender que Stu countera Starr Nova — sem precisar de nenhuma regra escrita explicando "por quê".
2. **Não fatiar o confronto por mapa/modo.** Quebrar em fatias finas demais (brawler A vs. B, só no mapa X, só no modo Y) nunca junta amostra suficiente pra ser confiável. O efeito do mapa/modo já é calculado separadamente (winrate por mapa) e somado à pontuação — os dois ficam agregados em suas próprias granularidades, não combinados numa fatia só.
3. **Tier e classe só entram como fallback**, quando ainda não existe amostra real suficiente daquele confronto específico (cold start). Não construir tabelas manuais exaustivas de "quem countera quem" — o sistema deve aprender priorizando as partidas reais registradas.

---

- [ ] **1. Sugestão de 2º/3º pick por sinergia com o pick anterior (considerando o inimigo)**
  Hoje o motor de recomendação pontua cada brawler de forma isolada. Este algoritmo sequencial analisa o 1º pick do nosso time e calcula a pontuação de sinergia com potenciais 2º e 3º picks baseando-se no histórico de partidas, alertando também sobre riscos e bans contra a composição inimiga.
  > **Exemplo Prático:** Selecionamos *Crow* na Mina Rochosa. O histórico mostra que *Max* tem alta sinergia com *Crow* nesse mapa. O algoritmo sugere *Max* com aviso de sinergia, mas identifica que a dupla *Crow + Max* sofre quando o inimigo picka *Bull*. O algoritmo emite um alerta recomendando o BAN do *Bull*, ou avisa do risco caso o *Bull* fique aberto.

- [ ] **2. Previsão do próximo pick do time inimigo**
  Baseado nos padrões gerais de first-pick/last-pick e winrates no mapa, estimar quais brawlers o inimigo tem mais chance de pegar em seguida — para orientar bans e picks preventivos.

- [ ] **3. Alerta de "comfort pick inconsistente"**
  Detectar quando um jogador tem um brawler marcado como comfort pick, mas o winrate real dele com esse brawler nas últimas partidas está baixo — sinalizando que o cadastro de conforto pode estar desatualizado.

- [ ] **4. Score de flexibilidade do brawler**
  Calcular, para cada brawler, em quantos modos e mapas diferentes ele tem bom desempenho (winrate acima da média). Brawlers com score de flexibilidade alto são mais seguros para first pick, já que não revelam uma estratégia específica cedo no draft.

- [ ] **5. Recomendação de brawlers para treinar**
  Cruzar o tier do meta atual com a amostra de partidas do time: sugerir brawlers fortes no meta que o time ainda tem pouquíssima experiência registrada, como sugestão de treino (complementa o Indicador de Confiança/Amostra do `IDEAS_FUTURAS.md`).

- [ ] **6. Pick "seguro" vs pick "de risco"**
  Classificar cada recomendação pela consistência do winrate, não só pela média: um brawler com winrate de 65% estável em várias partidas é um pick "seguro" (baixa variação), enquanto outro com a mesma média mas resultados muito alternados (vitórias/derrotas) é um pick "de risco". Útil para o técnico escolher entre jogar seguro ou arriscar, dependendo da importância da partida — sem depender de quem é o adversário.

- [ ] **7. Score de "poder de first pick"**
  Calcular quais brawlers são mais seguros para abrir o draft (bom em vários mapas/modos, não depende de combo com outro pick) versus quais só valem a pena quando pickados mais tarde, já sabendo o resto da composição.

- [ ] **8. "Pick armadilha" (trap pick)**
  Sinalizar brawlers que são fortes no tier geral do meta, mas em que o próprio time historicamente tem winrate ruim — mesmo sem depender de quem é o adversário, é um aviso de "cuidado, bom no papel mas não pro nosso elenco".

- [ ] **9. Valor decrescente do brawler no draft**
  Sinalizar quando um brawler forte está "na última rodada em que compensa pegá-lo" — ou seja, se ele não for escolhido agora, a chance de ele ainda estar disponível na próxima rodada de picks é baixa (baseado em quantos picks/bans faltam e no tier dele). Ajuda a decidir entre "pegar agora" ou "arriscar deixar pra depois".

- [ ] **10. Sinergia em trio, não só em dupla**
  Estender a lógica de sinergia (item 1) para reconhecer combinações de **três** brawlers que historicamente performam bem juntos como composição completa, não só pares.

- [ ] **11. Ponderação do Algoritmo por Objetivos do Modo de Jogo**
  Atribuir pesos matemáticos diferentes no motor de cálculo do draft dependendo dos objetivos de cada modo de jogo.
  > **Exemplo Prático:** No modo *Caça-Estrelas / Nocaute*, o algoritmo eleva o peso da métrica de Sobrevivência/Alcance e penaliza brawlers de estilo Aggro suicida. No modo *Roubo*, o algoritmo aumenta o peso de DPS sustentado e capacidade de pressão.
  - **Observação:** pensar sobre essa ideia

- [ ] **12. Motor de Sugestão Baseado nos Atributos dos Brawlers**
  Utilizar os atributos cadastrados (DPS, Alcance, Velocidade, Tipo de Dano) como critérios de desempate e afinidade no cálculo de recomendação de brawlers.
  > **Exemplo Prático:** Se a composição atual já tem 2 brawlers de dano único e o mapa exige controle de área, o algoritmo eleva a nota de brawlers com atributos de "Dano em Área" para equilibrar o time.
  - **Observação:** pensar sobre essa ideia, ainda nao existe o atributo dano em área.

- [ ] **13. Algoritmo de Detecção de Arquétipo de Composição**
  Analisar a combinação dos 3 brawlers selecionados e classificar automaticamente o padrão tático da composição montada.
  > **Exemplo Prático:** Frank + Poco + Buster ativam a classificação `Double Tank + Poco `. Piper + Angelo + Brock ativam `Triple Sniper / Longo Alcance`.

- [ ] **14. Cálculo de Tendência do Meta Interno (Média Móvel)**
  Comparar o winrate das últimas $N$ partidas registradas (ex: últimas 10) com o histórico global antigo da equipe para identificar brawlers que estão crescendo ou caindo de rendimento nos treinos.
  > **Exemplo Prático:** Brawler X tem 40% de WR no histórico geral, mas nas últimas 10 partidas teve 80% WR ➔ O algoritmo gera o marcador `Em Alta no Meta Interno`.