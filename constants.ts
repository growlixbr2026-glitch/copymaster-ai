



// IMPORTS MODULARES
import * as Global from './data/global';
import * as Social from './data/social';
import * as Copy from './data/copywriting';
import * as Visual from './data/visuals';
import * as Creative from './data/creative';
import * as Citation from './data/citations';

// Re-exports diretos para compatibilidade
export const { GLOBAL_LANGUAGES, IMAGE_AIS, VIDEO_AIS, VIBE_CODING_PLATFORMS, VIDEO_RATIOS } = Global;
export const { MAGAZINE_PRESETS, MAGAZINE_MOODS, VISUAL_COLORS, VISUAL_TEXTURES } = Visual;
export const { ELEVENLABS_VOICES, ELEVENLABS_MODELS, GOOGLE_TTS_VOICES } = Creative;

// FUNÇÃO MESTRA DE LOCALIZAÇÃO
export const getLocalizedLists = (langCode: string) => {
  const isPt = langCode === 'pt';
  const isEs = langCode === 'es';

  // Mapping de Tons por Plataforma (independente de língua por enquanto, mas pode evoluir)
  const toneMapping: Record<string, string[]> = {
    linkedin: isPt ? ['Profissional', 'Líder de Pensamento', 'Corporativo'] : isEs ? ['Profesional', 'Líder de Pensamiento', 'Corporativo'] : ['Professional', 'Thought Leader', 'Corporate'],
    instagram: isPt ? ['Descontraído', 'Inspirador', 'Visual'] : isEs ? ['Casual', 'Inspirador', 'Visual'] : ['Casual', 'Inspirational', 'Visual'],
    tiktok: isPt ? ['Humorístico', 'Autêntico', 'Rápido'] : isEs ? ['Humorístico', 'Auténtico', 'Rápido'] : ['Humorous', 'Authentic', 'Fast-paced'],
    ads: isPt ? ['Vendedor', 'Urgente', 'Direto'] : isEs ? ['Vendedor', 'Urgente', 'Directo'] : ['Salesy', 'Urgent', 'Direct']
  };

  return {
    // --- GLOBAL ---
    imageAIs: Global.IMAGE_AIS,
    videoRatios: Global.VIDEO_RATIOS,
    magPresets: Visual.MAGAZINE_PRESETS,
    magMoods: Visual.MAGAZINE_MOODS,
    visualColors: Visual.VISUAL_COLORS,
    visualTextures: Visual.VISUAL_TEXTURES,
    toneMapping,

    // --- SOCIAL & ADS ---
    socialPlatforms: isPt ? Social.SOCIAL_PLATFORMS_PT : isEs ? Social.SOCIAL_PLATFORMS_ES : Social.SOCIAL_PLATFORMS_EN,
    postTypes: isPt ? Social.POST_TYPES_PT : isEs ? Social.POST_TYPES_ES : Social.POST_TYPES_EN,
    adPlatforms: isPt ? Social.AD_PLATFORMS_PT : isEs ? Social.AD_PLATFORMS_ES : Social.AD_PLATFORMS_EN,
    adGoals: isPt ? Social.AD_GOALS_PT : isEs ? Social.AD_GOALS_ES : Social.AD_GOALS_EN,
    inspirationCategories: isPt ? Social.INSPIRATION_CATEGORIES_PT : isEs ? Social.INSPIRATION_CATEGORIES_ES : Social.INSPIRATION_CATEGORIES_EN,

    // --- COPYWRITING ---
    tones: isPt ? Copy.TONES_PT : isEs ? Copy.TONES_ES : Copy.TONES_EN,
    methodologies: isPt ? Copy.METHODOLOGIES_PT : isEs ? Copy.METHODOLOGIES_ES : Copy.METHODOLOGIES_EN,
    triggers: isPt ? Copy.TRIGGERS_PT : isEs ? Copy.TRIGGERS_ES : Copy.TRIGGERS_EN,
    funnelStages: isPt ? Copy.FUNNEL_STAGES_PT : isEs ? Copy.FUNNEL_STAGES_ES : Copy.FUNNEL_STAGES_EN,
    sins: isPt ? Copy.SINS_PT : isEs ? Copy.SINS_ES : Copy.SINS_EN,
    emailTypes: isPt ? Copy.EMAIL_TYPES_PT : isEs ? Copy.EMAIL_TYPES_ES : Copy.EMAIL_TYPES_EN,
    vslFrameworks: isPt ? Copy.VSL_FRAMEWORKS_PT : isEs ? Copy.VSL_FRAMEWORKS_ES : Copy.VSL_FRAMEWORKS_EN,
    lpTypes: isPt ? Copy.LP_TYPES_PT : isEs ? Copy.LP_TYPES_ES : Copy.LP_TYPES_EN,
    lpFrameworks: isPt ? Copy.LP_FRAMEWORKS_PT : isEs ? Copy.LP_FRAMEWORKS_ES : Copy.LP_FRAMEWORKS_EN,
    lpTechFrameworks: isPt ? Copy.LP_FRAMEWORKS_TECH_PT : isEs ? Copy.LP_FRAMEWORKS_TECH_ES : Copy.LP_FRAMEWORKS_TECH_EN,
    articleTypes: isPt ? Copy.ARTICLE_TYPES_PT : isEs ? Copy.ARTICLE_TYPES_ES : Copy.ARTICLE_TYPES_EN,
    prdTypes: isPt ? Copy.PRD_TYPES_PT : isEs ? Copy.PRD_TYPES_ES : Copy.PRD_TYPES_EN,
    prdSections: isPt ? Copy.PRD_SECTIONS_PT : isEs ? Copy.PRD_SECTIONS_ES : Copy.PRD_SECTIONS_EN,

    // --- VISUAL & DESIGN ---
    imageStyles: isPt ? Visual.IMAGE_STYLES_PT : isEs ? Visual.IMAGE_STYLES_ES : Visual.IMAGE_STYLES_EN,
    quoteStyles: isPt ? Visual.QUOTE_STYLES_PT : isEs ? Visual.QUOTE_STYLES_ES : Visual.QUOTE_STYLES_EN,
    citationAreas: isPt ? Citation.CITATION_AREAS_PT : isEs ? Citation.CITATION_AREAS_ES : Citation.CITATION_AREAS_EN,
    citationTones: isPt ? Citation.CITATION_TONES_PT : isEs ? Citation.CITATION_TONES_ES : Citation.CITATION_TONES_EN,
    citationSources: isPt ? Citation.CITATION_SOURCES_PT : isEs ? Citation.CITATION_SOURCES_ES : Citation.CITATION_SOURCES_EN,
    infoStyles: isPt ? Visual.INFOGRAPHIC_STYLES_PT : isEs ? Visual.INFOGRAPHIC_STYLES_ES : Visual.INFOGRAPHIC_STYLES_EN,
    infoLayouts: isPt ? Visual.INFOGRAPHIC_LAYOUTS_PT : isEs ? Visual.INFOGRAPHIC_LAYOUTS_ES : Visual.INFOGRAPHIC_LAYOUTS_EN,
    comicStyles: isPt ? Visual.COMIC_STYLES_PT : isEs ? Visual.COMIC_STYLES_ES : Visual.COMIC_STYLES_EN,
    comicLayouts: isPt ? Visual.COMIC_LAYOUTS_PT : isEs ? Visual.COMIC_LAYOUTS_ES : Visual.COMIC_LAYOUTS_EN,
    adultAnimationStyles: isPt ? Visual.ADULT_ANIMATION_STYLES_PT : isEs ? Visual.ADULT_ANIMATION_STYLES_ES : Visual.ADULT_ANIMATION_STYLES_EN,
    adultAnimationFormats: isPt ? Visual.ADULT_ANIMATION_FORMATS_PT : isEs ? Visual.ADULT_ANIMATION_FORMATS_ES : Visual.ADULT_ANIMATION_FORMATS_EN,
    memeStyles: isPt ? Visual.MEME_STYLES_PT : isEs ? Visual.MEME_STYLES_ES : Visual.MEME_STYLES_EN,
    memeFormats: isPt ? Visual.MEME_FORMATS_PT : isEs ? Visual.MEME_FORMATS_ES : Visual.MEME_FORMATS_EN,
    videoStyles: isPt ? Visual.VIDEO_STYLES_PT : isEs ? Visual.VIDEO_STYLES_ES : Visual.VIDEO_STYLES_EN,
    pptPlatforms: isPt ? Visual.PPT_PLATFORMS_PT : isEs ? Visual.PPT_PLATFORMS_ES : Visual.PPT_PLATFORMS_EN,
    pptStyles: isPt ? Visual.PPT_STYLES_PT : isEs ? Visual.PPT_STYLES_ES : Visual.PPT_STYLES_EN,
    pptPurposes: isPt ? Visual.PPT_PURPOSES_PT : isEs ? Visual.PPT_PURPOSES_ES : Visual.PPT_PURPOSES_EN,
    lpStyles: isPt ? Visual.LP_STYLES_PT : isEs ? Visual.LP_STYLES_ES : Visual.LP_STYLES_EN,
    letStyles: isPt ? Visual.LET_STYLES_PT : isEs ? Visual.LET_STYLES_ES : Visual.LET_STYLES_EN,
    letTechniques: isPt ? Visual.LET_TECHNIQUES_PT : isEs ? Visual.LET_TECHNIQUES_ES : Visual.LET_TECHNIQUES_EN,
    letSurfaces: isPt ? Visual.LET_SURFACES_PT : isEs ? Visual.LET_SURFACES_ES : Visual.LET_SURFACES_EN,
    letCompositions: isPt ? Visual.LET_COMPOSITIONS_PT : isEs ? Visual.LET_COMPOSITIONS_ES : Visual.LET_COMPOSITIONS_EN,
    paperSizes: isPt ? Global.PAPER_SIZES_PT : isEs ? Global.PAPER_SIZES_ES : Global.PAPER_SIZES_EN,
    
    // NEW: Logo & Brand
    logoStyles: isPt ? Visual.LOGO_STYLES_PT : isEs ? Visual.LOGO_STYLES_ES : Visual.LOGO_STYLES_EN,
    brandArchetypes: isPt ? Visual.BRAND_ARCHETYPES_PT : isEs ? Visual.BRAND_ARCHETYPES_ES : Visual.BRAND_ARCHETYPES_EN,
    famousPainters: Visual.FAMOUS_PAINTERS,
    famousDesigners: Visual.FAMOUS_DESIGNERS,
    logoPlatforms: Visual.LOGO_AI_PLATFORMS,

    // --- CREATIVE & AUDIO ---
    notebookModes: isPt ? Creative.NOTEBOOK_MODES_PT : isEs ? Creative.NOTEBOOK_MODES_ES : Creative.NOTEBOOK_MODES_EN,
    notebookObjectives: isPt ? Creative.NOTEBOOK_OBJECTIVES_PT : isEs ? Creative.NOTEBOOK_OBJECTIVES_ES : Creative.NOTEBOOK_OBJECTIVES_EN,
    sunoStyles: isPt ? Creative.SUNO_STYLES_PT : isEs ? Creative.SUNO_STYLES_ES : Creative.SUNO_STYLES_EN,
    sunoMoods: isPt ? Creative.SUNO_MOODS_PT : isEs ? Creative.SUNO_MOODS_ES : Creative.SUNO_MOODS_EN,
  };
};
