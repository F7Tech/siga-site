#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
BACKEND_DIR="/Users/filipe.gomes/Documents/PersonalWorkspace/despachante-backend"

cd "$PROJECT_DIR"

mkdir -p .codex/prompts
mkdir -p .codex
mkdir -p skills/frontend-security

cat > .codex/config.toml <<'EOF'
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
writable_roots = [".", "css", "js", "assets", "public", "img", "images"]
EOF

cat > skills/frontend-security/SKILL.md <<EOF
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
EOF

cat > .codex/prompts/frontend-security-task.md <<EOF
Inspecione primeiro o frontend existente.

Contexto importante:
- Este projeto usa HTML, CSS e JavaScript puro.
- O layout, CSS e identidade visual existentes devem ser preservados.
- Não usar frameworks.
- O backend local está em:
  $BACKEND_DIR

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
EOF

codex -C "$PROJECT_DIR" exec "$(cat .codex/prompts/frontend-security-task.md)"