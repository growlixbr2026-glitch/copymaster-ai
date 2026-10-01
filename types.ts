export type ReferenceMode = 'creative' | 'clone' | 'reference' | 'none' | 'high_fidelity';

export type FunnelStage = 
  | 'Topo de Funil (Consciência)' 
  | 'Meio de Funil (Consideração)' 
  | 'Fundo de Funil (Conversão)' 
  | 'Pós-Venda (Retenção/Fidelização)' 
  | 'Reengajamento (Win-back)';

export type PostType = 
  | 'Imagem Estática' 
  | 'Carrossel' 
  | 'Reels/Vídeo Curto' 
  | 'Story' 
  | 'Texto/Artigo' 
  | 'Enquete/Interativo' 
  | 'Anúncio/Ads' 
  | 'Thread (Fio)' 
  | 'Meme' 
  | 'Infográfico' 
  | 'Live (Roteiro)';

export interface CopyParams {
  platform: string;
  type: PostType;
  objective: string;
  funnelStage: FunnelStage;
  briefingType?: 'ideia' | 'completo' | 'referencia' | 'imagem' | 'pdf';
  briefingContent?: string;
  tones: string[];
  methodology: string;
  mentalTriggers: string[];
  targetLength?: number;
  language?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  audience: string;
  tone: string;
  vocabulary: string;
  mission: string;
  visuals: string;
}

export interface CarouselParams {
  slideCount: number;
  style: string;
  platform: string;
  aiModel: string;
  aspectRatio: string;
  footer: string;
  customText: string;
  context: string;
  writerStyle: string;
  language?: string;
}

export interface ArticleParams {
  type: string;
  tone: string;
  citeSources: boolean;
  includeBibliography: boolean;
  context: string;
  targetLength?: number;
  language: string;
  writerStyle: string;
}

export interface MagazineCoverParams {
  magazine: string;
  mood: string;
  headline: string;
  subheadline: string;
  footerText: string;
  context: string;
  aiModel: string;
  referenceImages?: string[];
  referenceMode?: ReferenceMode;
  language?: string;
}