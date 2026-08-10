# Algoritmos Futuros — TBK Hub

- [ ] **1. Sugestão de 2º/3º pick por sinergia com o pick anterior**
  Hoje o motor de recomendação pontua cada brawler de forma isolada. Um algoritmo
  sequencial poderia, ao sugerir o 2º pick, dar peso extra a brawlers que historicamente
  formam boas duplas com o 1º pick já escolhido.
  Exemplo: pego crow no mapa mina rochosa, mas nos ultimos treinos nesse mapa max formou uma otima dupla com crow, aí o sistema sugere ela com aviso de sinergia entre os dois picks, e leva em consideração o inimigo tambem  (eu pego crow e max e é bom, mas sempre que inimigo pega bull temos dificuldade, aí o sistema sugere esse ban caso a gente queira pegar esse double pick, ou se não banimos o bull, sistema avisa sobre a max mas fala do risco de tomarmos bull do inimigo, counterando assim nossos dois picks)

- [ ] **2. Previsão do próximo pick do time inimigo**
  Baseado no histórico de partidas contra aquele adversário (ou, na ausência disso, em
  padrões gerais de first-pick/last-pick), estimar quais brawlers o inimigo tem mais
  chance de pegar em seguida — para orientar bans e picks preventivos.

- [ ] **3. Alerta de "comfort pick inconsistente"**
  Detectar quando um jogador tem um brawler marcado como comfort pick, mas o winrate real
  dele com esse brawler nas últimas partidas está baixo — sinalizando que o cadastro de
  conforto pode estar desatualizado.

- [ ] **4. Score de flexibilidade do brawler**
  Calcular, para cada brawler, em quantos modos e mapas diferentes ele tem bom desempenho
  (winrate acima da média). Brawlers com score de flexibilidade alto são mais seguros para
  first pick, já que não revelam uma estratégia específica cedo no draft.

- [ ] **5. Recomendação de brawlers para treinar**
  Cruzar o tier do meta atual com a amostra de partidas do time: sugerir brawlers fortes no
  meta que o time ainda tem pouquíssima experiência registrada, como sugestão de treino
  (complementa o Indicador de Confiança/Amostra do `IDEAS_FUTURAS.md`).

- [ ] **6. Pick "seguro" vs pick "de risco"**
  Classificar cada recomendação pela consistência do winrate, não só pela média: um
  brawler com winrate de 65% estável em várias partidas é um pick "seguro" (baixa
  variação), enquanto outro com a mesma média mas resultados muito alternados
  (vitórias/derrotas) é um pick "de risco". Útil para o técnico escolher entre jogar
  seguro ou arriscar, dependendo da importância da partida — sem depender de quem é o
  adversário.

- [ ] **7. Score de "poder de first pick"**
  Calcular quais brawlers são mais seguros para abrir o draft (bom em vários
  mapas/modos, não depende de combo com outro pick) versus quais só valem a pena
  quando pickados mais tarde, já sabendo o resto da composição.

- [ ] **8. "Pick armadilha" (trap pick)**
  Sinalizar brawlers que são fortes no tier geral do meta, mas em que o próprio time
  historicamente tem winrate ruim — mesmo sem depender de quem é o adversário, é um
  aviso de "cuidado, bom no papel mas não pro nosso elenco".

- [ ] **9. Valor decrescente do brawler no draft**
  Sinalizar quando um brawler forte está "na última rodada em que compensa pegá-lo" — ou
  seja, se ele não for escolhido agora, a chance de ele ainda estar disponível na próxima
  rodada de picks é baixa (baseado em quantos picks/bans faltam e no tier dele). Ajuda a
  decidir entre "pegar agora" ou "arriscar deixar pra depois".

- [ ] **10. Sinergia em trio, não só em dupla**
  Estender a lógica de sinergia (item 1) para reconhecer combinações de **três** brawlers
  que historicamente performam bem juntos como composição completa, não só pares.