# Diretrizes de Interface e Acessibilidade (Projeto TBK Hub)

Quando implementar novas funcionalidades ou modificar o sistema, obedeça estritamente as seguintes regras de comportamento e atalhos globais:

### 1. Comandos Globais de Reversão e Saída (Desfazer/ESC)
*   **Web (Teclado):** 
    *   Sempre que um usuário focar em um campo de busca/pesquisa e pressionar \`ESC\` ou \`Ctrl + Z\`, o campo deve ser limpo.
    *   No \`DraftWizard\`, o atalho \`Ctrl + Z\` (em qualquer lugar que não seja um input de texto) executa a função global de **Desfazer (Undo)** do histórico do draft.
*   **Mobile (Botão Voltar Nativo):** 
    *   O botão de voltar do celular não deve fechar ou sair do site/app caso o usuário esteja em um fluxo contínuo (ex: selecionando picks no draft). O sistema deve mapear a navegação via evento \`popstate\` para interceptar o \`window.history.back()\` e traduzi-lo em uma ação "Desfazer" na pilha interna.

### 2. Comportamento de Modais (Click-Outside)
*   **Fechamento Intuitivo:** 
    *   Todo e qualquer Modal na aplicação (Brawlers, Mapas, Confirmações) DEVE ser possível de fechar tanto clicando no botão "X" / "Cancelar", quanto **clicando no fundo (overlay / backdrop)** escuro fora do componente do modal.
    *   Isto é um requisito UX não-negociável para as plataformas Web e Mobile.

### 3. Cursores de Botões
*   Não adicione a classe \`cursor-pointer\` manualmente nos botões um por um. O projeto possui uma regra CSS base (em \`index.css\`) que já aplica \`cursor: pointer\` para qualquer \`button:not(:disabled)\`.
