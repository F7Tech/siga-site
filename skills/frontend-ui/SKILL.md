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
/Users/filipe.gomes/Documents/PersonalWorkspace/despachante-backend

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
