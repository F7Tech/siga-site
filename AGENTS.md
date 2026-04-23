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
/Users/filipe.gomes/Documents/PersonalWorkspace/despachante-backend

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

## Segurança do frontend
- Não expor segredos nem lógica crítica no browser
- Validar toda entrada antes de enviar ao backend
- Evitar innerHTML inseguro
- Prevenir múltiplos submits
- Centralizar chamadas HTTP
- Preservar o layout existente
- Não usar frameworks