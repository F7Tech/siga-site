# SIGA Site

Frontend estático em HTML, CSS e JavaScript puro para consulta de débitos e fluxo de pagamento em 4 etapas.

## Como funciona hoje

O fluxo principal começa em `index.html`.

1. O usuário informa:
   - RENAVAM
   - estado
   - e-mail
2. O frontend consulta os dados do veículo.
3. O usuário é redirecionado para `debitos.html`.
4. Em `debitos.html`, o fluxo continua com:
   - seleção dos débitos
   - escolha da forma de pagamento
   - preenchimento dos dados pessoais com CEP, número e complemento
   - confirmação final e envio do checkout link

Também existe uma entrada secundária em `consulta.html`, que permite iniciar a consulta fora da landing page.

## Estado do fluxo

O estado da navegação é mantido no navegador com `localStorage`.

São persistidos:
- dados da consulta
- débitos selecionados
- forma de pagamento
- dados pessoais
- retorno do envio final

## Endpoints usados

- `POST http://35.185.125.121:8080/consulta`
- `POST http://35.185.125.121:8080/pagamentos/checkout-link`
- `GET {SIGA_CEP_API_BASE ou SIGA_API_BASE}/enderecos/cep/{cep}`

## Estrutura principal

- `index.html`
  Landing page e entrada principal do fluxo
- `consulta.html`
  Entrada secundária da consulta
- `debitos.html`
  Etapas 2, 3 e 4 do fluxo
- `js/payment-flow.js`
  Lógica de consulta, persistência, validação e envio
- `style.css`
  Estilos da landing page
- `css/style.css`
  Estilos das telas internas do fluxo
- `manifest.json`
  Configuração para instalação em dispositivos móveis
- `images/app-icons/`
  Ícones usados na instalação e atalhos do app

## Instalação no iPhone

O site possui:
- `manifest.json`
- `apple-touch-icon`
- meta tags para modo standalone

Para testar no iPhone:

1. Abra a URL do site no Safari.
2. Toque em compartilhar.
3. Escolha `Adicionar à Tela de Início`.

## Validações implementadas

- RENAVAM obrigatório
- e-mail obrigatório
- e-mail válido
- confirmação de e-mail igual ao e-mail
- telefone obrigatório

## Observações

- O projeto não usa framework, bundler ou TypeScript.
- O layout foi mantido em cima da estrutura visual já existente.
- Os dados do fluxo são carregados dinamicamente e renderizados nas telas de pagamento.
- A busca de CEP usa `window.SIGA_CEP_API_BASE` quando definido; caso contrário, usa a mesma base de `window.SIGA_API_BASE`.
- Se a consulta de CEP falhar ou o CEP não for encontrado, o usuário pode preencher logradouro, bairro, cidade e UF manualmente.
