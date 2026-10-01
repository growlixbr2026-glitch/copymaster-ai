/**
 * Erros amigáveis PT-BR — nunca exibir JSON cru ou segredos ao usuário (D3).
 * Mapeia falhas de provider/cota/rede para mensagens acionáveis.
 */

export function toFriendlyError(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) return 'Ocorreu um erro inesperado. Tente novamente.';
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const low = norm(text);

  // Nunca vazar JSON técnico / chaves / latências internas
  const looksTechnical = text.startsWith('{') || text.includes('"object":"error"') || text.includes('tier_not_allowed');

  if (low.includes('tier_not_allowed') || low.includes('not available in your subscription')) {
    return 'Seu plano não inclui este modelo. O sistema já tentou as outras chaves — abra o Centro de Comando e selecione OpenRouter (ou adicione uma chave com acesso ao modelo).';
  }
  if (low.includes("property 'system' is unsupported") || low.includes('additional properties') && low.includes('system')) {
    return 'Este provedor rejeitou o formato da chamada. O sistema já tentou os outros motores — selecione OpenRouter ou Gemini como Motor Primário no Centro de Comando.';
  }
  if (low.includes('free-models-per-day') || low.includes('free model requests per day')) {
    return 'Cota diária gratuita do OpenRouter esgotada (50/dia). Volta amanhã — ou selecione outro Motor Primário (Groq, NVIDIA, Mistral) no Centro de Comando.';
  }
  if (low.includes('requires more credits') || low.includes('insufficient credits')) {
    return 'Conta sem créditos para este modelo pago. Selecione um modelo gratuito ou outro Motor Primário no Centro de Comando.';
  }
  if (low.includes('user not found') || low.includes('401') || low.includes('invalid_api_key') || low.includes('invalid api key')) {
    return 'Chave de API inválida ou expirada. Confira a chave do Motor Primário no Centro de Comando.';
  }
  if (low.includes('todas as chaves falharam')) {
    return 'Todas as chaves falharam. Verifique suas chaves e cotas no Centro de Controle (aba Configurações) ou selecione outro Motor Primário.';
  }
  if (low.includes('no active credentials') || low.includes('nao configurada') || low.includes('nao configurado') || low.includes('sem chave')) {
    return 'Nenhuma chave configurada para este motor. Abra o Centro de Comando e cadastre sua chave (ou selecione OpenRouter).';
  }
  if (low.includes('9router local offline') || low.includes('localhost:20128')) {
    return 'Motor local 9Router offline. Rode `9router` no terminal ou selecione OpenRouter como Motor Primário no Centro de Comando.';
  }
  if (low.includes('rate') || low.includes('429') || low.includes('quota') || low.includes('exceeded') || low.includes('402') || low.includes('credit')) {
    return 'Limite do provedor atingido. Aguarde alguns segundos e tente de novo — o sistema gira as chaves automaticamente.';
  }
  if (low.includes('model_not_found') || low.includes('does not exist') || low.includes('404')) {
    return 'Modelo indisponível neste provedor. O sistema já tentou alternativas — selecione outro Motor Primário no Centro de Comando.';
  }
  if (low.includes('failed to fetch') || low.includes('network') || low.includes('abort') || low.includes('timeout')) {
    return 'Falha de rede ao falar com o provedor. Confira sua conexão e tente novamente.';
  }
  if (low.includes('json not found') || low.includes('fora do formato') || low.includes('formato invalido') || low.includes('resposta vazia') || low.includes('analysis failed') || low.includes('analise forense')) {
    return 'O modelo retornou uma resposta fora do formato (instabilidade momentânea do plano gratuito). Clique em "Tentar novamente" — normalmente resolve na 2ª tentativa.';
  }
  if (looksTechnical) {
    return 'O provedor retornou um erro técnico. Tente de novo ou troque o Motor Primário no Centro de Comando.';
  }
  // Mensagem já amigável: limita tamanho e devolve
  return text.length > 300 ? text.slice(0, 300) + '…' : text;
}
