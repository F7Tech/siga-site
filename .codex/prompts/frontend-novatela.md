Inspecione primeiro o frontend existente.

Objetivo:
Implementar a tela final do fluxo de pagamento, preservando o layout, CSS e identidade visual já existentes.

Regras:
- HTML, CSS e JavaScript puro
- não usar frameworks
- não refazer o design do zero
- preservar consulta.html, debitos.html e css/style.css como base principal
- usar a resposta real do backend do endpoint de checkout link

Implementar:
1. etapa final de sucesso após resposta positiva do backend
2. exibir mensagem de confirmação de envio do link de pagamento
3. exibir e-mail mascarado retornado pelo backend
4. exibir protocolo/identificador retornado pelo backend
5. botão para reiniciar o fluxo
6. tratamento visual para erro e loading
7. manter o visual atual do projeto

Texto sugerido da tela final:
- título: "Solicitação enviada com sucesso"
- mensagem: "Enviamos o link de pagamento para o e-mail informado."
- observação: "Caso não encontre, verifique também a caixa de spam."

Ao final mostrar:
- arquivos alterados
- fluxo ajustado
- como testar a etapa final