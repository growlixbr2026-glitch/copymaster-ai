// Catálogo do módulo Citação (quote-text de personalidades, versículos e provérbios).
// Padrão: 1ª opção sempre Automático. Autores referenciam área por id.
// Areas: filtro mestre do seletor em cascata (área → autor).

export interface CitationAuthor { name: string; area: string; }
const A = (name: string, area: string): CitationAuthor => ({ name, area });

export const CITATION_AREA_IDS = [
  'auto', 'filosofia', 'ciencia', 'literatura', 'musica', 'cinema',
  'politica', 'esporte', 'negocios', 'espiritualidade', 'humor',
  'ativismo', 'psicologia', 'biblia', 'proverbios', 'biscoito',
];

export const CITATION_AREAS_PT = [
  "✨ Automático (IA Escolhe)",
  "Filosofia", "Ciência & Tecnologia", "Literatura & Livros", "Música",
  "Cinema & Séries", "Política & História", "Esporte", "Negócios & Empreendedorismo",
  "Espiritualidade & Religião", "Humor & Comédia", "Ativismo & Direitos",
  "Psicologia & Mente", "✝️ Bíblia & Versículos", "🌍 Provérbios Mundiais", "🥠 Biscoito Chinês",
];

export const CITATION_AREAS_EN = [
  "✨ Automatic (AI Selects)",
  "Philosophy", "Science & Technology", "Literature & Books", "Music",
  "Cinema & Series", "Politics & History", "Sports", "Business & Entrepreneurship",
  "Spirituality & Religion", "Humor & Comedy", "Activism & Rights",
  "Psychology & Mind", "✝️ Bible & Verses", "🌍 World Proverbs", "🥠 Fortune Cookie",
];

export const CITATION_AREAS_ES = [
  "✨ Automático (IA Decide)",
  "Filosofía", "Ciencia & Tecnología", "Literatura & Libros", "Música",
  "Cine & Series", "Política & Historia", "Deporte", "Negocios",
  "Espiritualidad & Religión", "Humor & Comedia", "Activismo & Derechos",
  "Psicología & Mente", "✝️ Biblia & Versículos", "🌍 Proverbios Mundiales", "🥠 Galleta China",
];

export const CITATION_TONES_PT = [
  "✨ Automático (IA Sente o Contexto)",
  "Motivacional", "Inspirador", "Irônico", "Engraçado", "Revoltado / Protesto",
  "Indireta", "Realista / Duro", "Reflexivo / Filosófico", "Romântico",
  "Sarcástico", "Provocador", "Sábio / Estoico", "Esperançoso / Fé", "Nostálgico",
];

export const CITATION_TONES_EN = [
  "✨ Automatic (AI Senses Context)",
  "Motivational", "Inspirational", "Ironic", "Funny", "Outraged / Protest",
  "Shade / Indirect", "Realist / Raw", "Reflective / Philosophical", "Romantic",
  "Sarcastic", "Provocative", "Wise / Stoic", "Hopeful / Faith", "Nostalgic",
];

export const CITATION_TONES_ES = [
  "✨ Automático (IA Siente el Contexto)",
  "Motivacional", "Inspirador", "Irónico", "Gracioso", "Indignado / Protesta",
  "Indirecta", "Realista / Duro", "Reflexivo / Filosófico", "Romántico",
  "Sarcástico", "Provocador", "Sabio / Estoico", "Esperanzado / Fe", "Nostálgico",
];

export const CITATION_SOURCES_PT = [
  "✨ Automático (Melhor Fonte)",
  "Fala do autor", "Trecho de música", "Trecho de livro", "Fala de filme/série",
  "Discurso", "Entrevista", "Versículo Bíblico", "Provérbio Popular", "Mensagem de Biscoito",
];

export const CITATION_SOURCES_EN = [
  "✨ Automatic (Best Source)",
  "Author quote", "Song lyric", "Book excerpt", "Movie/TV line",
  "Speech", "Interview", "Bible verse", "Folk proverb", "Fortune cookie message",
];

export const CITATION_SOURCES_ES = [
  "✨ Automático (Mejor Fuente)",
  "Frase del autor", "Letra de canción", "Fragmento de libro", "Frase de película/serie",
  "Discurso", "Entrevista", "Versículo bíblico", "Proverbio popular", "Mensaje de galleta",
];

export const CITATION_AUTHORS: CitationAuthor[] = [
  // FILOSOFIA (32)
  A('Sócrates', 'filosofia'), A('Platão', 'filosofia'), A('Aristóteles', 'filosofia'),
  A('Sêneca', 'filosofia'), A('Marco Aurélio', 'filosofia'), A('Epicteto', 'filosofia'),
  A('Confúcio', 'filosofia'), A('Lao-Tsé', 'filosofia'), A('Nietzsche', 'filosofia'),
  A('Kant', 'filosofia'), A('Sartre', 'filosofia'), A('Simone de Beauvoir', 'filosofia'),
  A('Camus', 'filosofia'), A('Maquiavel', 'filosofia'), A('Descartes', 'filosofia'),
  A('Voltaire', 'filosofia'), A('Rousseau', 'filosofia'), A('Schopenhauer', 'filosofia'),
  A('Cícero', 'filosofia'), A('Pitágoras', 'filosofia'), A('Santo Agostinho', 'filosofia'),
  A('Tomás de Aquino', 'filosofia'), A('Averróis', 'filosofia'), A('Avicena', 'filosofia'),
  A('Maimônides', 'filosofia'), A('Hildegarda de Bingen', 'filosofia'), A('Boécio', 'filosofia'),
  A('Anselmo de Cantuária', 'filosofia'), A('Foucault', 'filosofia'), A('Hannah Arendt', 'filosofia'),
  A('Byung-Chul Han', 'filosofia'), A('Slavoj Žižek', 'filosofia'),
  // CIÊNCIA & TECNOLOGIA (18)
  A('Einstein', 'ciencia'), A('Marie Curie', 'ciencia'), A('Darwin', 'ciencia'),
  A('Tesla', 'ciencia'), A('Newton', 'ciencia'), A('Hawking', 'ciencia'),
  A('Galileu', 'ciencia'), A('Ada Lovelace', 'ciencia'), A('Turing', 'ciencia'),
  A('Edison', 'ciencia'), A('Carl Sagan', 'ciencia'), A('Neil deGrasse Tyson', 'ciencia'),
  A('Freud', 'ciencia'), A('Jung', 'ciencia'), A('Michio Kaku', 'ciencia'),
  A('Katie Bouman', 'ciencia'), A('Jennifer Doudna', 'ciencia'), A('Yuval Harari', 'ciencia'),
  // LITERATURA & LIVROS (30)
  A('Machado de Assis', 'literatura'), A('Clarice Lispector', 'literatura'), A('Shakespeare', 'literatura'),
  A('Fernando Pessoa', 'literatura'), A('Carlos Drummond', 'literatura'), A('Cecília Meireles', 'literatura'),
  A('Guimarães Rosa', 'literatura'), A('Jorge Amado', 'literatura'), A('Paulo Coelho', 'literatura'),
  A('Saint-Exupéry', 'literatura'), A('Dostoievski', 'literatura'), A('Tolstói', 'literatura'),
  A('Oscar Wilde', 'literatura'), A('Mark Twain', 'literatura'), A('Hemingway', 'literatura'),
  A('Jane Austen', 'literatura'), A('Kafka', 'literatura'), A('Gabriel García Márquez', 'literatura'),
  A('Mia Couto', 'literatura'), A('Conceição Evaristo', 'literatura'), A('Itamar Vieira Jr.', 'literatura'),
  A('Chimamanda Adichie', 'literatura'), A('Haruki Murakami', 'literatura'), A('Elena Ferrante', 'literatura'),
  A('Colleen Hoover', 'literatura'), A('Rupi Kaur', 'literatura'), A('Vargas Llosa', 'literatura'),
  A('José Saramago', 'literatura'), A('Lygia Fagundes Telles', 'literatura'), A('Carolina Maria de Jesus', 'literatura'),
  // MÚSICA (35)
  A('John Lennon', 'musica'), A('Bob Marley', 'musica'), A('Cazuza', 'musica'),
  A('Renato Russo', 'musica'), A('Elis Regina', 'musica'), A('Chico Buarque', 'musica'),
  A('Caetano Veloso', 'musica'), A('Gilberto Gil', 'musica'), A('Raul Seixas', 'musica'),
  A('Beyoncé', 'musica'), A('Taylor Swift', 'musica'), A('Tupac', 'musica'),
  A('Kendrick Lamar', 'musica'), A('Emicida', 'musica'), A('Mano Brown', 'musica'),
  A('Freddie Mercury', 'musica'), A('David Bowie', 'musica'), A('Bob Dylan', 'musica'),
  A('Belchior', 'musica'), A('Gonzaguinha', 'musica'), A('Anitta', 'musica'),
  A('Ludmilla', 'musica'), A('Pabllo Vittar', 'musica'), A('Iza', 'musica'),
  A('Liniker', 'musica'), A('Djavan', 'musica'), A('Milton Nascimento', 'musica'),
  A('Travis Scott', 'musica'), A('Drake', 'musica'), A('Bad Bunny', 'musica'),
  A('Billie Eilish', 'musica'), A('The Weeknd', 'musica'), A('Rihanna', 'musica'),
  A('Criolo', 'musica'), A('Djonga', 'musica'),
  // CINEMA & SÉRIES (22)
  A('Chaplin', 'cinema'), A('Tarantino', 'cinema'), A('Hitchcock', 'cinema'),
  A('Spielberg', 'cinema'), A('Walt Disney', 'cinema'), A('Meryl Streep', 'cinema'),
  A('Denzel Washington', 'cinema'), A('Rocky Balboa (personagem)', 'cinema'), A('Coringa (personagem)', 'cinema'),
  A('Yoda (personagem)', 'cinema'), A('Dom Corleone (personagem)', 'cinema'), A('Forrest Gump (personagem)', 'cinema'),
  A('Clint Eastwood', 'cinema'), A('Fernanda Montenegro', 'cinema'), A('Christopher Nolan', 'cinema'),
  A('Greta Gerwig', 'cinema'), A('Jordan Peele', 'cinema'), A('Wagner Moura', 'cinema'),
  A('Selton Mello', 'cinema'), A('Viola Davis', 'cinema'), A('Zendaya', 'cinema'),
  A('Pedro Pascal', 'cinema'),
  // POLÍTICA & HISTÓRIA (28)
  A('Mandela', 'politica'), A('Gandhi', 'politica'), A('Martin Luther King Jr.', 'politica'),
  A('Churchill', 'politica'), A('Lincoln', 'politica'), A('Barack Obama', 'politica'),
  A('Lula', 'politica'), A('Marielle Franco', 'politica'), A('Che Guevara', 'politica'),
  A('Simón Bolívar', 'politica'), A('Tiradentes', 'politica'), A('Zumbi dos Palmares', 'politica'),
  A('Napoleão', 'politica'), A('Cleópatra', 'politica'), A('Martinho Lutero', 'politica'),
  A('João Calvino', 'politica'), A('Jan Hus', 'politica'), A('Savonarola', 'politica'),
  A('Bartolomeu de las Casas', 'politica'), A('Joaquim Nabuco', 'politica'), A('Getúlio Vargas', 'politica'),
  A('Juscelino Kubitschek', 'politica'), A('Zelensky', 'politica'), A('Jacinda Ardern', 'politica'),
  A('Angela Merkel', 'politica'), A('Pepe Mujica', 'politica'), A('Thomas Sankara', 'politica'),
  A('Kwame Nkrumah', 'politica'),
  // ESPORTE (17)
  A('Pelé', 'esporte'), A('Ayrton Senna', 'esporte'), A('Muhammad Ali', 'esporte'),
  A('Michael Jordan', 'esporte'), A('Marta', 'esporte'), A('Rayssa Leal', 'esporte'),
  A('Kobe Bryant', 'esporte'), A('Serena Williams', 'esporte'), A('Guga Kuerten', 'esporte'),
  A('Bernardinho', 'esporte'), A('Vinicius Jr.', 'esporte'), A('Endrick', 'esporte'),
  A('Rebeca Andrade', 'esporte'), A('Gabriel Medina', 'esporte'), A('Verstappen', 'esporte'),
  A('Messi', 'esporte'), A('Cristiano Ronaldo', 'esporte'),
  // NEGÓCIOS (16)
  A('Steve Jobs', 'negocios'), A('Elon Musk', 'negocios'), A('Bill Gates', 'negocios'),
  A('Warren Buffett', 'negocios'), A('Jeff Bezos', 'negocios'), A('Silvio Santos', 'negocios'),
  A('Luiza Trajano', 'negocios'), A('Jorge Paulo Lemann', 'negocios'), A('Oprah Winfrey', 'negocios'),
  A('Walt Disney', 'negocios'), A('Sam Altman', 'negocios'), A('Jensen Huang', 'negocios'),
  A('Mark Zuckerberg', 'negocios'), A('Satya Nadella', 'negocios'), A('Flávio Augusto', 'negocios'),
  A('Romero Rodrigues', 'negocios'),
  // ESPIRITUALIDADE (14)
  A('Jesus Cristo', 'espiritualidade'), A('Buda', 'espiritualidade'), A('Madre Teresa', 'espiritualidade'),
  A('Dalai Lama', 'espiritualidade'), A('Chico Xavier', 'espiritualidade'), A('Papa Francisco', 'espiritualidade'),
  A('Mahatma Gandhi', 'espiritualidade'), A('Rumi', 'espiritualidade'), A('São Francisco de Assis', 'espiritualidade'),
  A('Irmã Dulce', 'espiritualidade'), A('Padre Fábio de Melo', 'espiritualidade'), A('Monja Coen', 'espiritualidade'),
  A('Sadhguru', 'espiritualidade'), A('Eckhart Tolle', 'espiritualidade'),
  // HUMOR & COMÉDIA (8)
  A('Jô Soares', 'humor'), A('Chico Anysio', 'humor'), A('Dercy Gonçalves', 'humor'),
  A('Paulo Gustavo', 'humor'), A('Tatá Werneck', 'humor'), A('Jim Carrey', 'humor'),
  A('Robin Williams', 'humor'), A('Oscar Wilde', 'humor'),
  // ATIVISMO (13)
  A('Malala', 'ativismo'), A('Rosa Parks', 'ativismo'), A('Frida Kahlo', 'ativismo'),
  A('Abdias do Nascimento', 'ativismo'), A('Lélia Gonzalez', 'ativismo'), A('Greta Thunberg', 'ativismo'),
  A('Desmond Tutu', 'ativismo'), A('Kofi Annan', 'ativismo'), A('Djamila Ribeiro', 'ativismo'),
  A('Sônia Guajajara', 'ativismo'), A('Txai Suruí', 'ativismo'), A('Leah Thomas', 'ativismo'),
  A('Boyan Slat', 'ativismo'),
  // PSICOLOGIA & MENTE (6)
  A('Augusto Cury', 'psicologia'), A('Viktor Frankl', 'psicologia'), A('Carl Jung', 'psicologia'),
  A('Sigmund Freud', 'psicologia'), A('Daniel Kahneman', 'psicologia'), A('Brené Brown', 'psicologia'),
  // BÍBLIA — LIVROS (12)
  A('Salmos', 'biblia'), A('Provérbios (livro bíblico)', 'biblia'), A('Eclesiastes', 'biblia'),
  A('Gênesis', 'biblia'), A('Isaías', 'biblia'), A('Evangelho de Mateus', 'biblia'),
  A('Evangelho de João', 'biblia'), A('Romanos (Paulo)', 'biblia'), A('Coríntios (Paulo)', 'biblia'),
  A('Apocalipse', 'biblia'), A('Êxodo', 'biblia'), A('Filipenses (Paulo)', 'biblia'),
  // PROVÉRBIOS MUNDIAIS (13)
  A('Confúcio (chinês)', 'proverbios'), A('Lao-Tsé (chinês)', 'proverbios'), A('Sun Tzu (chinês)', 'proverbios'),
  A('Rumi (persa)', 'proverbios'), A('Omar Khayyam (persa)', 'proverbios'), A('Saadi (persa)', 'proverbios'),
  A('Khalil Gibran (árabe-libanês)', 'proverbios'), A('Provérbio Árabe (tradicional)', 'proverbios'),
  A('Provérbio Africano (tradicional)', 'proverbios'), A('Provérbio Japonês (tradicional)', 'proverbios'),
  A('Provérbio Indiano (tradicional)', 'proverbios'), A('Provérbio Russo (tradicional)', 'proverbios'),
  A('Mil e Uma Noites (árabe)', 'proverbios'),
  // BISCOITO CHINÊS — TEMAS ANÔNIMOS (5)
  A('Sorte Clássica', 'biscoito'), A('Amor', 'biscoito'), A('Prosperidade', 'biscoito'),
  A('Sabedoria', 'biscoito'), A('Bom Humor', 'biscoito'),
];

export function getAuthorsByArea(areaId: string): CitationAuthor[] {
  if (!areaId || areaId === 'auto') return CITATION_AUTHORS;
  return CITATION_AUTHORS.filter((a) => a.area === areaId);
}

export function getAreaIdByIndex(index: number): string {
  return CITATION_AREA_IDS[index] || 'auto';
}
