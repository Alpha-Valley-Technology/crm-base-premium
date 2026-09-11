// Deixa o container pronto para `npm test` (a suíte das regras do banco).
//
// A suíte usa `@firebase/rules-unit-testing` e o `firebase` do próprio projeto,
// que moram em `node_modules` da raiz — e ali, dentro do container, é volume
// vazio na primeira vez. Sem isto, `npm test` falharia com "módulo não
// encontrado", que manda procurar defeito no teste em vez de no ambiente.

import { garantirDependencias } from './dependencias.mjs';

garantirDependencias('/app', 'da raiz do projeto');
