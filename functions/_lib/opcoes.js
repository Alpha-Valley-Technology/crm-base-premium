// Limites globais de TODA função deste projeto.
//
// Precisa ser importado ANTES de qualquer arquivo que defina função: os corpos
// dos módulos importados rodam na ordem de declaração, e as funções se
// registram na hora em que o módulo é executado.
//
// Por que existe: o padrão do Firebase é até 100 instâncias simultâneas por
// função. Com 16 funções, isso reserva CPU muito além da cota da região —
// o deploy passa a falhar com "Quota exceeded for total allowable CPU per
// project per region". E, se algo disparasse em massa, a conta iria junto.
//
// 5 instâncias por função é folgado para uma equipe interna: significa 5
// gerações de conteúdo ao mesmo tempo, na mesma função.

import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
  region: 'southamerica-east1',
  maxInstances: 5,
  // Uma requisição por instância: as funções de IA são demoradas e pesadas,
  // dividir a mesma instância entre pedidos só faria as duas demorarem mais.
  concurrency: 1,
});
