import { Page, Locator } from '@playwright/test';

// Helpers compartilhados de navegação para specs live.
//
// Dois bugs de drift motivaram este módulo (corrigidos em 2026-10-02):
// 1. Localizar tab por ÍNDICE numérico quebra a cada sessão nova (PRD em
//    2026-09-27 deslocou tudo em +1 e derrubou general-user/verification).
// 2. Ler o painel ativo com `[role="tabpanel"][aria-hidden="false"]` NUNCA
//    casa: no App.tsx o role=tabpanel é o CONTÊINER e o aria-hidden fica nos
//    FILHOS keep-alive (o mesmo bug já documentado em basic-flow.spec.ts).
//
// Regra: id OU rótulo PT do sidebar — ids como 'lp', 'magazine' ou 'ideas'
// não aparecem literalmente no rótulo ("Landing Pages", "Autoridade Visual",
// "Sessão de Ideias").

/** id de sessão → rótulo PT exato da sidebar (App.tsx NavItem). */
export const TAB_LABELS: Record<string, string> = {
  ideas: 'Sessão de Ideias',
  copy: 'Copywriting Pro',
  notebook: 'NotebookLM (Estudo)',
  personas: 'Personas',
  prd: 'PRD Vibe Studio',
  email: 'Email Marketing',
  vsl: 'Roteiro VSL',
  lp: 'Landing Pages',
  ads: 'Gestor de Ads',
  sexy: 'Sexy Canvas',
  tiktok: 'TikTok Studio',
  reels: 'Reels Studio',
  youtube: 'YouTube Studio',
  logo: 'Identidade de Elite',
  carousel: 'Carrossel Maker',
  magazine: 'Autoridade Visual',
  quote: 'Gerador de Frases',
  citation: 'Citações Verificadas',
  lettering: 'Tipografia Artística',
  comic: 'HQ & Quadrinhos',
  adultAnimation: 'Roteiro Animação',
  meme: 'Fabrica de Memes',
  infographic: 'Infográfico',
  article: 'Redator Artigos',
  ppt: 'Apresentações (PPT)',
  media: 'Media Prompts (Visual)',
  inspiration: 'Estúdio de Inspiração',
  seoAudit: 'SEO/AEO/GEO Audit',
  keywords: 'Keyword Discovery',
  contentBrief: 'Content Brief',
  competitor: 'Competitor Analysis',
  outreach: 'Sales Outreach',
  leadMagnet: 'Lead Magnet',
  launch: 'Launch Plan',
  churn: 'Churn Prevention',
  pmf: 'PMF Canvas',
  flywheel: 'Growth Flywheel',
  partnerships: 'Partnerships',
  channelEconomics: 'Channel Economics',
  revops: 'RevOps Brief',
  pricing: 'Pricing Strategy',
  coldEmail: 'Cold Email B2B',
  battleCard: 'Battle Card',
  enablement: 'Sales Enablement',
  dealDesk: 'Deal Desk',
  aePrep: 'AE Prep',
  salesEngineer: 'Sales Engineer',
  customerSuccess: 'Customer Success',
  salesOps: 'Sales Operations',
  stress: 'Auditoria do Sistema',
};

/**
 * Índice do tab da sidebar para o id de sessão (id OU rótulo PT, case-insensitive).
 * Primeira ocorrência na ordem da sidebar (ex.: 'email' acha "Email Marketing"
 * antes de "Cold Email B2B"). -1 se não achar.
 */
export async function findSessionTabIndex(tabs: Locator, id: string): Promise<number> {
  const n = await tabs.count();
  const needleId = id.toLowerCase();
  const label = TAB_LABELS[id];
  const needleLabel = label ? label.toLowerCase() : null;
  for (let i = 0; i < n; i++) {
    const text = ((await tabs.nth(i).textContent()) || '').trim().toLowerCase();
    if (text.includes(needleId) || (needleLabel && text.includes(needleLabel))) return i;
  }
  return -1;
}

/** Clica no tab da sessão. false = tab não encontrada (drift de rótulo). */
export async function clickSessionTab(page: Page, id: string): Promise<boolean> {
  const tabs = page.getByRole('tab');
  const idx = await findSessionTabIndex(tabs, id);
  if (idx < 0) return false;
  await tabs.nth(idx).click();
  return true;
}

/**
 * Texto do painel keep-alive VISÍVEL de verdade: o filho de [role=tabpanel]
 * com style display:block + aria-hidden="false" (nunca o contêiner).
 * '' se nenhum filho estiver ativo.
 */
export async function activePanelText(page: Page): Promise<string> {
  const kids = page.locator('[role="tabpanel"] > div');
  const n = await kids.count();
  for (let i = 0; i < n; i++) {
    const kid = kids.nth(i);
    const st = (await kid.getAttribute('style').catch(() => '')) || '';
    const hidden = await kid.getAttribute('aria-hidden').catch(() => null);
    if (st.includes('display: block') && hidden === 'false') {
      return ((await kid.textContent()) || '').trim();
    }
  }
  return '';
}
