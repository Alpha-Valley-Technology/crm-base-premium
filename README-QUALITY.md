# Qualidade, tooling e automação

Este projeto agora inclui configuração moderna para padronizar estilo, qualidade e rotina de desenvolvimento.

## O que foi configurado

- Prettier para formatar arquivos JS/JSON/MD/HTML/CSS
- ESLint para validar código JavaScript
- Husky + lint-staged para rodar validação em commit
- scripts de build, audit, clean e prepare
- gate de qualidade no comando `npm run build`

## Scripts principais

- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run lint:fix`
- `npm run build`
- `npm run audit`
- `npm run clean`

## Observações

- O comando `build` roda verificações de qualidade antes de testes adicionais.
- O projeto ainda usa `firebase emulators`, então a parte de build é mais de validação de código do que compilação tradicional.
- O `prepare` ativa o Husky localmente após a instalação de dependências.
