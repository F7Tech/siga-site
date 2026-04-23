Inspecione primeiro o frontend existente.

Contexto importante:
- Este projeto usa HTML, CSS e JavaScript puro.
- O layout, CSS e identidade visual existentes devem ser preservados.
- Não usar frameworks.
- O backend local está em:
  /Users/filipe.gomes/Documents/PersonalWorkspace/despachante-backend

Objetivo:
Endurecer o frontend do fluxo de pagamento sem quebrar a experiência atual.

Implemente:
1. validação forte de entrada
2. prevenção de múltiplos submits
3. debounce nas ações sensíveis
4. centralização das chamadas HTTP
5. tratamento padronizado de loading, erro e sucesso
6. renderização segura sem uso inseguro de innerHTML
7. redução de funções globais desnecessárias
8. uso de sessionStorage apenas se necessário
9. preservação de consulta.html, debitos.html e css/style.css como base principal

Regras:
- não inventar endpoints
- não refazer o design
- não destruir o CSS existente
- não expor lógica sensível no front
- listar no final os arquivos alterados e as proteções adicionadas
