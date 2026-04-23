Inspecione primeiro a estrutura real deste frontend.

Contexto importante:
- Este frontend é estático, feito apenas com HTML, CSS e JavaScript puro.
- Não usar React, Vue, Angular, Next, TypeScript, bundlers ou frameworks.
- O projeto já possui CSS, identidade visual e estrutura de layout bem definidos.
- Não descartar o visual atual.
- Não refazer o design do zero.
- Reutilizar o CSS, os componentes visuais, os estilos e o formato já existentes.
- O backend local está neste caminho:
  /Users/filipe.gomes/Documents/PersonalWorkspace/despachante-backend

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
