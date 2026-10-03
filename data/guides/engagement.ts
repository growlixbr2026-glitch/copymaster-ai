import type { SessionGuide } from '../guides';

/** Guias da categoria Engajamento (autoridade via resposta a comentários). */
export const GUIDES_ENGAGEMENT: SessionGuide[] = [
  // ------------------------------------------------------- RESPONDER COMENTÁRIOS
  {
    sessionId: 'commentResponder',
    sessionTitle: 'Responder Comentários',
    category: 'Engajamento',
    badge: 'text',
    whatIsIt: `A sessão Responder Comentários transforma uma FONTE (postagem colada, artigo/link copiado, imagem da postagem ou PDF) ou o COMENTÁRIO RECEBIDO em respostas contextuais prontas para publicar. O sistema lê a fonte e devolve N variações que seguem a fórmula ouro da pesquisa de engajamento 2026: (1) reforçar UM ponto específico do que foi escrito, (2) acrescentar valor novo (dado, exemplo, micro-história), (3) terminar com pergunta aberta que convida a fio — porque fio com resposta vale mais que comentário solto para o algoritmo.\\n\\nDois modos: COMENTAR NA POSTAGEM (você deixa um comentário no post de terceiro/parceiro — constrói autoridade à vista da audiência dele) e RESPONDER COMENTÁRIO (alguém comentou no SEU post e você responde — mantém a conversa viva). A Nota do Estrategista traz o tipo de fonte detectado, a janela ideal de resposta daquela rede e o que personalizar antes de publicar.`,
    purpose: 'Transformar postagem/comentário em resposta de autoridade sem parecer bot. Casos de uso: (1) comentar posts de líderes do nicho para ganhar visibilidade; (2) responder elogios/perguntas/objeções no seu post sem resposta genérica; (3) rebater crítica com educação; (4) reaproveitar um artigo em 3 comentários estratégicos de posicionamento.',
    outputKind: 'text',
    expectedOutput: 'Texto puro (badge Texto): 1-3 variações separadas por |||COMMENT_DIVIDER||| + |||NOTA_DIVIDER||| com a Nota do Estrategista (tipo de fonte, janela de resposta por rede, personalização, risco). Cada variação cita pelo menos um termo concreto da fonte — nunca "obrigado!" genérico.',
    subsessions: [
      { id: 'mode-post', title: 'Modo: Comentar na postagem', description: 'A fonte é a postagem de terceiro; você deixa UM comentário que conversa com o autor do post.' },
      { id: 'mode-comment', title: 'Modo: Responder comentário', description: 'A fonte é o comentário recebido no seu post; a resposta fala com quem comentou (elogio, pergunta, crítica, objeção).' },
      { id: 'source', title: 'Fonte: Texto / Imagem / PDF', description: 'Cole o texto (ou trecho do artigo), envie a imagem da postagem (lida por visão) ou o PDF — a IA extrai os fatos e usa como contexto verdadeiro.' },
    ],
    inputs: [
      { key: 'mode', label: 'Modo', type: 'radio', required: true, options: ['Comentar na postagem', 'Responder comentário'], description: 'Define quem é o interlocutor da resposta.' },
      { key: 'sourceType', label: 'Fonte', type: 'radio', required: true, options: ['Texto', 'Imagem', 'PDF'], description: 'Como a postagem chega: texto colado, upload de imagem ou upload de PDF (imagem/PDF são analisados pela IA antes da geração).' },
      { key: 'context', label: 'Postagem / Comentário *', type: 'textarea', required: true, description: 'A fonte obrigatória — sem ela o botão fica bloqueado (Item 18: bloquear em vez de supor). Ex.: "Bastante gente subestima o poder de uma boa rotina matinal...".' },
      { key: 'platform', label: 'Rede', type: 'select', required: false, description: 'Rede onde o comentário será publicado — define janela de resposta e registro (X=primeiros minutos; LinkedIn=primeira hora; YouTube=dias).' },
      { key: 'objective', label: 'Objetivo', type: 'select', required: false, options: ['Autoridade (dado/exemplo)', 'Engajar (abrir conversa)', 'Adicionar valor', 'Concordar e ampliar', 'Discordar com educação', 'Pergunta aberta (fio)', 'Agradecer e puxar conversa', 'Autoridade comercial sutil'], description: 'O que a resposta deve provocar. Padrão: Autoridade.' },
      { key: 'tone', label: 'Tom', type: 'select', required: false, description: 'Tom da resposta (lista localizada).' },
      { key: 'length', label: 'Tamanho', type: 'select', required: false, options: ['curto', 'medio', 'longo'], description: 'Curto = 1-2 frases; Médio = ponto + valor + pergunta; Longo = parágrafo (LinkedIn/blog).' },
      { key: 'variations', label: 'Variações', type: 'select', required: false, options: ['1', '2', '3'], description: 'Quantas respostas gerar (padrão 3).' },
      { key: 'extra', label: 'Contexto extra', type: 'textarea', required: false, description: 'Modo post: quem você é/por que comenta. Modo comment: resumo do post ao qual o comentário pertence.' },
    ],
    workflow: [
      'Abra Responder Comentários no menu (grupo Engajamento).',
      'Escolha o modo: Comentar na postagem ou Responder comentário.',
      'Escolha a fonte: cole o texto, ou envie a imagem/PDF da postagem (a IA extrai os fatos automaticamente).',
      'Ajuste rede, objetivo, tom, tamanho e nº de variações (padrão: Autoridade, médio, 3).',
      'Clique em Gerar Respostas e aguarde o stream.',
      'Compare as variações na aba correspondente; leia a Nota (janela de resposta e o que personalizar).',
      'Copie a preferida e publique dentro da janela ideal da rede.',
    ],
    proTips: [
      'Responda nas PRIMEIRAS horas — a rede está testando o post e a resposta reinicia a atenção de quem comentou (LinkedIn: primeira hora tem ~3x mais respostas).',
      'A fórmula ouro é infalível: ponto específico + valor novo + pergunta aberta. Pergunta sem resposta ensina a audiência que não vale perguntar.',
      'Comente posts de 5 perfis-alvo do seu nicho toda semana: comentário de autoridade é vitrine gratuita antes de a pessoa conhecer seu perfil.',
      'Nunca publique "obrigado!" — o modo Objetivo "Agradecer e puxar conversa" força referência a um detalhe concreto.',
      'Crítica recebida? Use Objetivo "Discordar com educação" e leve para DM se esquentar — discussão pública destrói reputação.',
      'Use a Nota do Estrategista: ela diz a janela de resposta daquela rede e o que personalizar (nome do autor, dado do post).',
    ],
    commonMistakes: [
      'Fonte vazia → botão bloqueado. Cole o texto ou envie o arquivo.',
      'Publicar resposta genérica ("muito bom!") — o algoritmo e as pessoas ignoram; a sessão existe justamente para evitar isso.',
      'Copiar a variação sem ler a Nota: pode citar dado que não existe no post (a Constituição proíbe inventar estatística).',
      'Responder fora da janela (X pede minutos; LinkedIn, as primeiras horas) — o fio morre.',
      'Modo trocado: responder um comentário no modo "comentar na postagem" deixa a resposta falando com o autor errado.',
    ],
    integratesWith: ['copy', 'ideas', 'personas', 'seoAudit', 'inspiration'],
    exportsTo: ['Clipboard', 'PDF', 'RefinementToolbar (Expandir/Encurtar/Humanizar/Verificar IA)'],
    limitations: [
      'Não publica nem agenda — a entrega é texto copia-cola (badge Texto).',
      'Não lê comentários automaticamente: a fonte é o que você cola/envia.',
      'Links de redes frequentemente exigem login; prefira colar o texto ou enviar imagem/PDF da postagem.',
      'Sem dados privados (insights da rede): a janela de resposta é orientação geral por plataforma.',
    ],
    knownBlocks: [
      'Sem fonte (texto vazio e sem arquivo) → geração bloqueada com aviso (Item 18).',
      'Upload de imagem/PDF com erro de leitura → aviso amarelo; cole o texto como alternativa.',
      'Modelo `:free` pode oscilar o divisor — o parser tolera e agrupa por variação.',
    ],
    examples: [
      {
        title: 'Comentar um post de autoridade (modo post)',
        inputs: { Modo: 'Comentar na postagem', Fonte: 'Texto colado (post sobre constância)', Rede: 'LinkedIn (Perfil Pessoal)', Objetivo: 'Autoridade (dado/exemplo)', Tamanho: 'Médio', Variações: '3' },
        expectedResult: '3 comentários que citam um detalhe do post, acrescentam um dado/método e fecham com pergunta aberta + Nota com a janela do LinkedIn.',
      },
      {
        title: 'Responder objeção recebida (modo comment)',
        inputs: { Modo: 'Responder comentário', Fonte: 'Texto colado ("Isso não funciona na prática...")', Rede: 'Instagram (Feed)', Objetivo: 'Discordar com educação', Variações: '2' },
        expectedResult: '2 respostas calmas que reconhecem o ponto válido, apresentam contraprova sem atacar e convidam para DM/fio + Nota com risco a evitar.',
      },
    ],
    faq: [
      { q: 'Qual a diferença dos dois modos?', a: 'POST = você comenta no post de OUTREM (autoridade à vista da audiência dele). COMMENT = você responde a quem comentou no SEU post (mantém a conversa e o algoritmo acordado).' },
      { q: 'Por que 3 variações?', a: 'Para você escolher o registro que combina com o momento — ou testar A/B. Cada uma segue a fórmula ouro, mudando ângulo/entrada.' },
      { q: 'A resposta cita dados?', a: 'Só os que existirem na fonte. Sem dado real, a Constituição manda não inventar estatística — a Nota avisa o que personalizar.' },
      { q: 'Serve para responder reviews/atenção ao cliente?', a: 'Serve para tom público de marca. Casos extremos (reclamação grave) a Nota orienta levar para DM — a sessão não substitui suporte oficial.' },
      { q: 'Por que a rede importa?', a: 'Janela e registro mudam: X pede minutos e concisão; LinkedIn pede 15+ palavras e dado; YouTube aceita resposta pensada em dias. O prompt ajusta as regras por rede.' },
    ],
  },
];
