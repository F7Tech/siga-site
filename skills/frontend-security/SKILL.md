---
name: frontend-security
description: Use quando a tarefa envolver endurecimento de frontend estático em HTML, CSS e JavaScript puro, incluindo validação, fluxo seguro, prevenção de abuso, renderização segura e integração com backend.
---

## Objetivo
Melhorar a segurança prática do frontend sem destruir a identidade visual nem introduzir frameworks.

## Regras obrigatórias
1. Preserve HTML, CSS e layout existentes.
2. Não refaça o design do zero.
3. Não introduza React, Vue, Angular, TypeScript ou bundlers.
4. Não exponha segredos, chaves ou lógica sensível no frontend.
5. Centralize chamadas HTTP em um módulo JS único quando possível.
6. Evite uso inseguro de innerHTML.
7. Use textContent sempre que possível.
8. Implemente validação de entrada antes de enviar ao backend.
9. Implemente proteção contra múltiplos submits.
10. Preserve o fluxo atual do projeto.

## Validações mínimas
- RENAVAM obrigatório
- e-mail obrigatório e válido
- confirmação de e-mail igual ao e-mail
- telefone obrigatório
- impedir avanço de etapa sem dados mínimos

## Endurecimento esperado
- debounce em consulta
- botão desabilitado durante envio
- loading, erro e sucesso padronizados
- evitar funções globais desnecessárias
- usar sessionStorage só se necessário
- renderização segura de dados recebidos

## Entrega esperada
- arquivos alterados
- proteções adicionadas
- fluxo preservado
- instruções de teste
