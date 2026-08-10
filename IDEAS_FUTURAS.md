# Ideias Futuras — TBK Hub

Backlog de melhorias planejadas, ainda **não implementadas**. Cada item aqui deve virar
seu próprio prompt/tarefa quando for a vez dele — não implementar tudo de uma vez.

## Ideias do Davi

1. **Tradução do sistema para Inglês e Espanhol**
   Adicionar um seletor de idioma na interface, com português como padrão. Envolve
   implementar i18n (ex: react-i18next), extrair todas as strings hoje hardcoded no código
   para arquivos de tradução, e traduzir cada uma para EN e ES. Escopo grande — melhor
   tratar como projeto isolado, não misturado com mudanças de algoritmo.

2. **Campo de DPS por brawler**
   Adicionar um campo `dps` (Alto / Médio / Baixo) no cadastro de cada brawler, para ser
   usado pelo algoritmo de recomendação. Exemplo: brawlers de DPS baixo não deveriam ser
   fortemente sugeridos em modos que exigem dano sustentado, como Roubo (onde o objetivo é
   destruir o cofre inimigo).

3. **Objetivo por modo de jogo**
   Cadastrar, para cada modo (Caça-Estrelas, Roubo, Nocaute, Pique-Gema, Fute-Brawl, Zona
   Estratégica), qual é o objetivo real do modo e a prioridade relativa entre os
   sub-objetivos, para o algoritmo de recomendação pesar isso.
   Exemplo: no Caça-Estrelas o objetivo é matar e sobreviver, mas sobreviver pesa mais que
   matar — o sistema deveria priorizar bons "matadores" (Algoz/Tiro Preciso) combinados com
   Suportes que mantêm o time vivo, e brawlers de alta mobilidade/velocidade, em vez de só
   olhar dano bruto.

## Sugestões do Claude

4. **Indicador de confiança/amostra**
   Quando uma sugestão do algoritmo vem de winrate com poucas partidas registradas (ex: 2
   jogos), sinalizar visualmente que o dado ainda é raso, para diferenciar de uma sugestão
   apoiada em uma amostra grande (ex: 50 partidas).

5. **Detecção de tendência do meta interno**
   Comparar o winrate das últimas N partidas de um brawler contra o winrate anterior a
   essas partidas, para detectar se ele está "subindo" ou "caindo" de força dentro das
   próprias scrims do time, além do tier oficial cadastrado.

6. **Perfil/scouting de adversário recorrente**
   Quando o time enfrenta o mesmo adversário mais de uma vez, manter um histórico
   específico contra aquele time (picks favoritos deles, bans que costumam fazer) para uso
   no próximo confronto.

7. **Detecção automática de arquétipo de composição**
   Reconhecer padrões como "comp de poke", "double tank", "dive comp" a partir dos
   tipos/classes escolhidos no draft, como contexto complementar ao alerta de composição
   desbalanceada que já existe.

8. **Exportar relatório pós-scrim**
   Gerar automaticamente uma imagem ou PDF resumido da sessão de treino (picks, bans,
   resultado, destaques) para compartilhar rapidamente com o time.

9. **Rotação de jogadores**
   Alertar se os mesmos jogadores estão sendo escalados sempre enquanto outros do elenco
   não jogam há muito tempo.

10. **Sincronização automática do tier list do meta**
    Hoje o tier S/A/B/C/D de cada brawler é cadastrado manualmente. Uma automação futura
    poderia puxar atualizações de tier de uma fonte confiável a cada balanceamento do jogo,
    em vez de exigir atualização manual.
