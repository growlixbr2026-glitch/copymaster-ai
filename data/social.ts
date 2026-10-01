



// PT
export const SOCIAL_PLATFORMS_PT = [
  "✨ Automático (IA Define a Melhor)",
  "Instagram (Feed)", "Instagram (Stories)", "Instagram (Reels)", "Threads (Meta)",
  "LinkedIn (Perfil Pessoal)", "LinkedIn (Página Empresa)", "LinkedIn (Newsletter)",
  "TikTok", "TikTok (Stories)",
  "Facebook (Feed)", "Facebook (Stories)", "Facebook (Reels)", "Facebook (Grupo)",
  "Twitter/X", "Twitter/X (Thread)",
  "YouTube (Shorts)", "YouTube (Community)", "YouTube (Descrição de Vídeo)",
  "Pinterest", "Blog/SEO", "Email Marketing", "WhatsApp (Broadcast)", "Telegram (Canal)",
  "Discord (Comunidade)", "Medium", "Substack", "Twitch (Sobre)", "Google Meu Negócio"
];
export const POST_TYPES_PT = [
    "✨ Automático (IA Sugere)",
    "Imagem Estática", "Carrossel", "Reels/Vídeo Curto", "Story", "Texto/Artigo", 
    "Enquete/Interativo", "Anúncio/Ads", "Thread (Fio)", "Meme", "Infográfico", "Live (Roteiro)"
];
export const AD_PLATFORMS_PT = ["✨ Automático", "Facebook/Instagram Ads", "Google Ads (Search)", "YouTube Ads", "LinkedIn Ads", "TikTok Ads", "Pinterest Ads", "Native Ads (Taboola/Outbrain)"];
export const AD_GOALS_PT = ["✨ Automático", "Vendas/Conversão", "Leads/Cadastros", "Tráfego/Cliques", "Reconhecimento de Marca", "Engajamento", "Instalação de App", "Mensagens (WhatsApp/Direct)"];

// --- INSPIRATION CATEGORIES (PT) - MASSIVE EXPANSION ---
export const INSPIRATION_CATEGORIES_PT = [
    { 
        id: 'thinkers', 
        label: '🏛️ Pensadores / Filósofos', 
        subTypes: [
            'Estoicismo (Sêneca/Marco Aurélio)', 'Filosofia Grega (Platão/Aristóteles/Sócrates)', 
            'Filosofia Oriental (Confúcio/Lao-Tsé)', 'Existencialismo (Sartre/Camus/Nietzsche)',
            'Filosofia Política (Maquiavel/Hobbes)', 'Filosofia da Arte/Estética', 
            'Literatura Clássica (Dostoievski/Tolstoi)', 'Empreendedorismo (Steve Jobs/Elon Musk)',
            'Estratégia Militar (Sun Tzu)', 'Sabedoria Ancestral Indígena'
        ] 
    },
    { 
        id: 'biblical', 
        label: '✝️ Bíblico / Religioso', 
        subTypes: [
            'Novo Testamento (Evangelhos)', 'Velho Testamento (Histórico)', 'Salmos (Louvor/Lamento)', 
            'Provérbios (Sabedoria)', 'Eclesiastes (Reflexão)', 'Parábolas de Jesus', 'Cartas Paulinas (Doutrina)', 
            'Apocalipse (Profético)', 'Torá Judaica', 'Alcorão (Citações Respeitosas)', 'Bhagavad Gita'
        ] 
    },
    { 
        id: 'musical', 
        label: '🎵 Musical / Letras', 
        subTypes: [
            'Rock Nacional (Legião/Barão/Cazuza)', 'MPB (Chico/Caetano/Gil)', 'Rap Nacional (Racionais/Emicida)', 
            'Hip-Hop Internacional (Tupac/Kendrick)', 'Pop Internacional (Beyoncé/Taylor)', 'Sertanejo Raiz/Universitário', 
            'Gospel / Worship', 'Samba e Pagode', 'Jazz / Blues Classics', 'Indie / Alternativo'
        ] 
    },
    { 
        id: 'scientists', 
        label: '🔬 Cientistas / Gênios', 
        subTypes: [
            'Física (Einstein/Feynman/Hawking)', 'Astronomia (Sagan/Tyson)', 'Tecnologia (Ada Lovelace/Turing)', 
            'Biologia/Evolução (Darwin)', 'Matemática Pura', 'Inventores (Tesla/Edison)', 'Psicologia (Freud/Jung)',
            'Neurociência Moderna'
        ] 
    },
    { 
        id: 'reformers', 
        label: '🔥 Reformadores / História', 
        subTypes: [
            'Reforma Protestante (Lutero/Calvino)', 'Direitos Civis (MLK/Rosa Parks)', 
            'Revolucionários (Che/Gandhi/Mandela)', 'Líderes Mundiais (Churchill/Lincoln)', 
            'Feminismo Histórico (Frida/Beauvoir)', 'Abolicionistas'
        ] 
    },
    { 
        id: 'goodvibes', 
        label: '✨ Good Vibes / Positividade', 
        subTypes: [
            'Lei da Atração / Manifestação', 'Gratidão Diária', 'Mindfulness / Presença', 
            'Afirmações Positivas (Eu Sou)', 'Conexão com a Natureza', 'Astrologia / Signos', 
            'Energia e Chakras', 'Ho\'oponopono', 'Minimalismo'
        ] 
    },
    { 
        id: 'indirects', 
        label: '💅 Indiretas / Sarcasmo', 
        subTypes: [
            'Para Inimigos / Haters', 'Para Ex-Namorado(a)', 'Ambiente de Trabalho Tóxico', 
            'Amizades Falsas', 'Ironia Fina / Deboche Elegante', 'Sinceridade Ácida', 
            'Indireta Motivacional ("Venci")', 'Status de WhatsApp'
        ] 
    },
    { 
        id: 'jokes', 
        label: '🤣 Humor / Piadas', 
        subTypes: [
            'One-liners (Frases Curtas)', 'Trocadilhos Infames (Tio do Pavê)', 'Anti-piada / Humor Seco', 
            'Situações Cotidianas (Eu na Vida)', 'Trabalho / Escritório / CLT', 'Humor Autodepreciativo',
            'Memes em Texto', 'Cantadas Baratas'
        ] 
    },
    {
        id: 'cinema',
        label: '🎬 Cinema e Séries',
        subTypes: [
            'Frases de Vilões Icônicos', 'Discursos Inspiradores de Heróis', 'Diálogos Românticos',
            'Comédias Clássicas', 'Filmes Cult / Tarantino', 'Disney / Pixar (Lições de Vida)',
            'Séries de TV (Friends/Office/GoT)', 'Animes (Shonen/Seinen)'
        ]
    },
    {
        id: 'business',
        label: '💼 Business / Carreira',
        subTypes: [
            'Liderança e Gestão', 'Vendas e Persuasão', 'Produtividade Extrema', 
            'Fracasso e Resiliência', 'Inovação e Futuro', 'Finanças e Investimentos',
            'Marketing Digital', 'Cultura de Startup'
        ]
    }
];

// EN
export const SOCIAL_PLATFORMS_EN = [
  "✨ Automatic (AI Selects Best)",
  "Instagram (Feed)", "Instagram (Stories)", "Instagram (Reels)", "Threads (Meta)",
  "LinkedIn (Personal Profile)", "LinkedIn (Company Page)", "LinkedIn (Newsletter)",
  "TikTok", "TikTok (Stories)",
  "Facebook (Feed)", "Facebook (Stories)", "Facebook (Reels)", "Facebook (Group)",
  "Twitter/X", "Twitter/X (Thread)",
  "YouTube (Shorts)", "YouTube (Community)", "YouTube (Video Description)",
  "Pinterest", "Blog/SEO", "Email Marketing", "WhatsApp (Broadcast)", "Telegram (Channel)",
  "Discord (Community)", "Medium", "Substack", "Twitch (About)", "Google My Business", "Reddit"
];
export const POST_TYPES_EN = [
    "✨ Automatic (AI Suggests)",
    "Static Image", "Carousel", "Reels/Short Video", "Story", "Text/Article", 
    "Poll/Interactive", "Ad/Sponsored", "Thread", "Meme", "Infographic", "Live Script"
];
export const AD_PLATFORMS_EN = ["✨ Automatic", "Facebook/Instagram Ads", "Google Ads (Search)", "YouTube Ads", "LinkedIn Ads", "TikTok Ads", "Pinterest Ads", "Native Ads"];
export const AD_GOALS_EN = ["✨ Automatic", "Sales/Conversion", "Leads/Signups", "Traffic/Clicks", "Brand Awareness", "Engagement", "App Install", "Messaging"];

// --- INSPIRATION CATEGORIES (EN) ---
export const INSPIRATION_CATEGORIES_EN = [
    { id: 'thinkers', label: '🏛️ Thinkers / Philosophers', subTypes: ['Stoicism', 'Greek Philosophy', 'Politics', 'Art', 'Literature', 'Entrepreneurship', 'Military Strategy'] },
    { id: 'biblical', label: '✝️ Biblical / Religious', subTypes: ['New Testament', 'Old Testament', 'Psalms', 'Proverbs', 'Parables', 'Revelation', 'Quran', 'Eastern Wisdom'] },
    { id: 'musical', label: '🎵 Musical / Lyrics', subTypes: ['Song Lyrics', 'Classic Rock', 'Pop', 'Hip-Hop', 'Country', 'Jazz', 'Gospel', 'Indie'] },
    { id: 'scientists', label: '🔬 Scientists / Geniuses', subTypes: ['Physics', 'Astronomy', 'Technology', 'Biology', 'Mathematics', 'Inventors', 'Psychology'] },
    { id: 'reformers', label: '🔥 Reformers / History', subTypes: ['Protestant Reformation', 'Civil Rights', 'Revolutionaries', 'World Leaders', 'Feminism'] },
    { id: 'goodvibes', label: '✨ Good Vibes / Positivity', subTypes: ['Law of Attraction', 'Gratitude', 'Mindfulness', 'Affirmations', 'Nature', 'Astrology'] },
    { id: 'indirects', label: '💅 Sarcasm / Shade', subTypes: ['For Enemies', 'For Exes', 'Work', 'Fake People', 'Irony', 'Sass', 'Motivational Shade'] },
    { id: 'jokes', label: '🤣 Humor / Jokes', subTypes: ['One-liners', 'Puns', 'Anti-jokes', 'Daily Situations', 'Work/Office', 'Self-deprecating'] },
    { id: 'cinema', label: '🎬 Cinema & TV', subTypes: ['Villain Quotes', 'Hero Speeches', 'Romantic Lines', 'Comedy Classics', 'Cult Movies', 'Disney/Pixar', 'TV Shows', 'Anime'] },
    { id: 'business', label: '💼 Business / Career', subTypes: ['Leadership', 'Sales', 'Productivity', 'Resilience', 'Innovation', 'Finance', 'Marketing'] }
];

// ES
export const SOCIAL_PLATFORMS_ES = [
  "✨ Automático (IA Decide la Mejor)",
  "Instagram (Feed)", "Instagram (Stories)", "Instagram (Reels)", "Threads (Meta)",
  "LinkedIn (Perfil Personal)", "LinkedIn (Página de Empresa)", "LinkedIn (Newsletter)",
  "TikTok", "TikTok (Stories)",
  "Facebook (Feed)", "Facebook (Historias)", "Facebook (Reels)", "Facebook (Grupo)",
  "Twitter/X", "Twitter/X (Hilo)",
  "YouTube (Shorts)", "YouTube (Comunidad)", "YouTube (Descripción)",
  "Pinterest", "Blog/SEO", "Email Marketing", "WhatsApp (Difusión)", "Telegram (Canal)",
  "Discord (Comunidade)", "Medium", "Substack", "Twitch (Acerca de)", "Google My Business", "Reddit"
];
export const POST_TYPES_ES = [
    "✨ Automático (IA Sugiere)",
    "Imagen Estática", "Carrusel", "Reels/Video Corto", "Historia", "Texto/Artículo", 
    "Encuesta/Interactivo", "Anuncio/Ads", "Hilo (Thread)", "Meme", "Infografía", "Guion Live"
];
export const AD_PLATFORMS_ES = ["✨ Automático", "Facebook/Instagram Ads", "Google Ads (Búsqueda)", "YouTube Ads", "LinkedIn Ads", "TikTok Ads", "Pinterest Ads", "Native Ads"];
export const AD_GOALS_ES = ["✨ Automático", "Ventas/Conversión", "Leads/Registros", "Tráfico/Clics", "Reconocimiento de Marca", "Compromiso", "Instalación de App", "Mensajería"];

// --- INSPIRATION CATEGORIES (ES) ---
export const INSPIRATION_CATEGORIES_ES = [
    { id: 'thinkers', label: '🏛️ Pensadores / Filósofos', subTypes: ['Estoicismo', 'Filosofía Griega', 'Política', 'Arte', 'Literatura', 'Emprendimiento'] },
    { id: 'biblical', label: '✝️ Bíblico / Religioso', subTypes: ['Nuevo Testamento', 'Antiguo Testamento', 'Salmos', 'Proverbios', 'Parábolas'] },
    { id: 'musical', label: '🎵 Musical / Letras', subTypes: ['Letras de Canciones', 'Rock', 'Pop', 'Hip-Hop', 'Latino', 'Reggaeton'] },
    { id: 'scientists', label: '🔬 Científicos / Genios', subTypes: ['Física', 'Astronomía', 'Tecnología', 'Biología', 'Matemáticas'] },
    { id: 'reformers', label: '🔥 Reformadores / Historia', subTypes: ['Reforma Protestante', 'Derechos Civiles', 'Revolucionarios', 'Líderes Mundiales'] },
    { id: 'goodvibes', label: '✨ Good Vibes / Positividad', subTypes: ['Ley de Atracción', 'Gratitud', 'Mindfulness', 'Afirmaciones'] },
    { id: 'indirects', label: '💅 Indirectas / Sarcasmo', subTypes: ['Para Enemigos', 'Para Ex', 'Trabajo', 'Gente Falsa', 'Ironía'] },
    { id: 'jokes', label: '🤣 Humor / Chistes', subTypes: ['Frases Cortas', 'Juegos de Palabras', 'Situaciones Cotidianas'] },
    { id: 'cinema', label: '🎬 Cine y TV', subTypes: ['Villanos', 'Héroes', 'Románticas', 'Comedia', 'Culto', 'Disney', 'Series', 'Anime'] },
    { id: 'business', label: '💼 Negocios / Carrera', subTypes: ['Liderazgo', 'Ventas', 'Productividad', 'Resiliencia', 'Innovación', 'Finanzas'] }
];
