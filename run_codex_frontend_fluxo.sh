#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
BACKEND_DIR="/Users/filipe.gomes/Documents/PersonalWorkspace/despachante-backend"

cd "$PROJECT_DIR"

if ! command -v codex >/dev/null 2>&1; then
  echo "Erro: codex CLI não encontrado no PATH."
  echo "Instale e tente novamente."
  exit 1
fi

mkdir -p .codex/prompts
mkdir -p .codex
mkdir -p skills/frontend-ui

cat > .codex/config.toml <<'EOF'
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
writable_roots = [".", "css", "js", "assets", "public", "img", "images"]
EOF

cat > AGENTS.md <<EOF
# Objetivo
Implementar o fluxo de pagamento em 4 etapas neste frontend estático, preservando a identidade visual, o CSS e a estrutura já existentes.
Já temos telas criadas, valide todas as telas antes de criar novas!

## Restrições
- Não usar frameworks
- Não usar TypeScript
- Não usar bundlers
- Não inventar endpoints
- Não refazer o design do zero
- Reutilizar CSS e layout já existentes
- Inspecionar o backend local antes de integrar

## Caminho do backend
$BACKEND_DIR

## Fluxo obrigatório
1. Consulta por RENAVAM + e-mail
2. Exibição dos débitos + forma de pagamento
3. Dados pessoais
4. Checkout link com confirmação

## Regras
1. Inspecione primeiro os arquivos existentes do front.
2. Preserve o visual e a estrutura atual do projeto.
3. Reutilize o CSS existente antes de criar novos estilos.
4. Faça mudanças pequenas e funcionais.
5. Implemente validação, loading, erro e sucesso.
6. Ajuste responsividade sem descaracterizar o layout.
7. Ao final, listar arquivos alterados, endpoints integrados e como testar.
EOF

cat > skills/frontend-ui/SKILL.md <<EOF
---
name: frontend-ui
description: Use quando a tarefa envolver frontend estático em HTML, CSS e JavaScript puro, com integração REST, fluxo multi-etapas, responsividade e preservação da identidade visual existente.
---

## Objetivo
Ajustar o frontend existente para implementar o fluxo de pagamento em 4 etapas, mantendo a identidade visual, o CSS e a estrutura já presentes no projeto.

## Restrições obrigatórias
- Este projeto usa apenas HTML, CSS e JavaScript puro
- Não usar React, Vue, Angular, Next, TypeScript ou bundlers
- Não refazer o design do zero
- Não destruir a estrutura visual existente
- Reutilizar CSS, classes, estilos e componentes visuais já presentes
- Não inventar endpoints ou payloads
- Inspecionar o backend local antes de integrar

## Caminho do backend
$BACKEND_DIR

## Fluxo obrigatório
1. Consulta por RENAVAM + e-mail
2. Exibição de débitos + escolha de forma de pagamento
3. Coleta de dados pessoais
4. Envio para checkout link + confirmação ao usuário

## Regras de implementação
1. Inspecione primeiro os arquivos HTML, CSS e JS existentes.
2. Preserve a identidade visual e a estrutura atual do front.
3. Reutilize o CSS existente antes de criar novos estilos.
4. Só adicionar CSS novo quando for necessário para o fluxo ou responsividade.
5. Inspecione o backend local para descobrir os endpoints reais.
6. Use apenas HTML, CSS e JavaScript puro.
7. Mantenha o estado do fluxo entre as etapas.
8. Implemente loading, erro e sucesso.
9. Ajuste responsividade sem descaracterizar o layout.
10. Ao final, listar arquivos alterados e como testar.

## Evitar
- redesign completo
- troca de estrutura sem necessidade
- criação de estilos paralelos desnecessários
- layout genérico ou simplificado demais
- inventar contratos ou endpoints

## Entrega esperada
- arquivos alterados
- endpoints integrados
- fluxo em 4 etapas funcionando
- layout preservado e ajustado
- instruções de teste
EOF

cat > .codex/prompts/frontend-task.md <<EOF
Inspecione primeiro a estrutura real deste frontend.

Contexto importante:
- Este frontend é estático, feito apenas com HTML, CSS e JavaScript puro.
- Não usar React, Vue, Angular, Next, TypeScript, bundlers ou frameworks.
- O projeto já possui CSS, identidade visual e estrutura de layout bem definidos.
- Não descartar o visual atual.
- Não refazer o design do zero.
- Reutilizar o CSS, os componentes visuais, os estilos e o formato já existentes.
- O backend local está neste caminho:
  $BACKEND_DIR

Objetivo:
Implementar o fluxo completo de pagamento em 4 etapas, mantendo a linha visual e estrutural já existente no frontend.

Fluxo obrigatório:
1. Tela de consulta
   - capturar RENAVAM
   - capturar e-mail
   - chamar o backend para consultar os dados

2. Tela de débitos e forma de pagamento
   - exibir os dados retornados da consulta
   - listar os débitos encontrados
   - permitir escolha da forma de pagamento

3. Tela de dados pessoais
   - nome
   - endereço de recebimento
   - e-mail
   - confirmação de e-mail
   - telefone

4. Tela final
   - enviar os dados consolidados para o endpoint real de checkout link
   - exibir confirmação de que o link foi enviado por e-mail

Regras obrigatórias:
1. Inspecione primeiro os arquivos HTML, CSS e JS já existentes antes de editar.
2. Preserve o visual, a identidade e a estrutura do projeto.
3. Reutilize o CSS existente antes de criar estilos novos.
4. Só criar novos estilos quando realmente necessário.
5. Não invente endpoints, payloads ou contratos.
6. Inspecione o backend no caminho informado para descobrir os endpoints reais já implementados.
7. Não introduza frameworks nem ferramentas novas.
8. Faça mudanças mínimas e funcionais.
9. Preserve o fluxo entre etapas, mantendo os dados do usuário durante a navegação.
10. Implemente validações básicas:
   - RENAVAM obrigatório
   - e-mail obrigatório
   - confirmação de e-mail igual ao e-mail
   - telefone obrigatório
11. Implemente tratamento de loading, erro e sucesso.
12. Ajuste a responsividade usando apenas HTML/CSS/JS.
13. Ao final, liste os arquivos alterados, os endpoints integrados e como testar o fluxo.

Importante:
- O objetivo não é deixar o frontend genérico ou simples.
- O objetivo é manter o projeto visualmente bom e consistente, apenas adaptando o fluxo de pagamento e a integração com o backend.
EOF

echo ">>> Rodando Codex no frontend: $PROJECT_DIR"
echo ">>> Backend de referência: $BACKEND_DIR"

codex -C "$PROJECT_DIR" exec "$(cat .codex/prompts/frontend-task.md)"