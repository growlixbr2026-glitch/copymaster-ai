// Templates fill-in-the-blank para os 22 frameworks direct-response.
// Cada template é um array de strings que juntas formam um prompt de copy.
// Placeholders: {{productName}}, {{audience}}, {{painPoint}}, {{offer}}, {{tone}}

export interface CopyTemplate {
    framework: string;
    structure: string;
    example: string;
}

export const COPY_TEMPLATES_PT: Record<string, CopyTemplate> = {
    "Schwartz 5-Stage Awareness (Eugene Schwartz - Breakthrough Advertising)": {
        framework: "Schwartz 5-Stage Awareness",
        structure: `# Etapa 1: Consciência do Problema
O prospect sabe que tem um problema mas não entende a causa.
Exemplo: "Você sente que seu corpo não responde mais como antes..."

# Etapa 2: Consciência da Solução
O prospect sabe que existem soluções mas não as conhece todas.
Exemplo: "Existem métodos que podem ajudá-lo..."

# Etapa 3: Consciência do Produto
O prospect conhece seu produto mas não sente urgência.
Exemplo: "Nosso programa foi desenvolvido para..."

# Etapa 4: Consciência da Marca
O prospect conhece sua marca mas não tomou ação.
Exemplo: "Mais de 10.000 pessoas já transformaram seus resultados..."

# Etapa 5: Total Consciência
O prospect está pronto para comprar mas precisa de um empurrão.
Exemplo: "Últimas vagas com descarga de R$1.997 para R$997"`,
        example: "Use este framework para copy de produtos de baixo reconhecimento. Comece com empatia e avance gradualmente até a oferta."
    },
    "Halbert Boron Letters (Gary Halbert - 25 Princípios)": {
        framework: "Halbert Boron Letters",
        structure: `# Princípio 1: O Fator "Starving Crowd"
Encontre um mercado faminto por uma solução.
Exemplo: "Equipes de vendas que perdem 30% dos leads por falta de follow-up"

# Princípio 2: A Fórmula da "Curiosidade Gap"
Abra um loop na mente do leitor.
Exemplo: "O erro #1 que mata 80% das campanhas de e-mail..."

# Princípio 3: Headline que Para o Prospecto
Um headline que force a leitura.
Exemplo: "Pare de perder clientes por causa de um só e-mail"

# Princípio 4: Fale com 1 Pessoa
Escreva como se fosse uma conversa 1-a-1.
Exemplo: "Você sente que está trabalhando mais e vendendo menos?"

# Princípio 5: Prove Tudo
Dados, estatísticas, testemunhos ou garantias.
Exemplo: "327 empresas aumentaram conversões em 45% nos primeiros 30 dias"`,
        example: "Aplique os 5 primeiros princípios para campanhas de aquisição com alta intencionalidade de compra."
    },
    "Ogilvy Big Idea + Research (David Ogilvy - Confessions)": {
        framework: "Ogilvy Big Idea + Research",
        structure: `# 1. Pesquisa Profunda (3-5 horas por copy)
- Estude a concorrência
- Entenda o cliente (interviews, surveys)
- Identifique a promessa única

# 2. Big Idea (O Conceito Central)
Um insight emocional ou racional que ancora toda a copy.
Exemplo: "O cérebro humano processa imagens 60.000x mais rápido que texto"

# 3. Headline Baseado na Big Idea
Exemplo: "O Segredo Visual que Aumenta Conversões em 67%"

# 4. Corpo que Desenvolve a Big Idea
Use histórias, analogias e provas para validar a ideia.

# 5. CTA Direto
Exemplo: "Comece seu teste grátis de 14 dias e veja os resultados"`,
        example: "Use para copy de alto valor onde a credibilidade é essencial."
    },
    "Caples Tested Headlines (John Caples - 35 Headline Formulas)": {
        framework: "Caples Tested Headlines",
        structure: `# Fórmula #1: "How To" + Resultado + Limitação
Exemplo: "Como Perder 10kg em 30 Dias sem Passar Fome"

# Fórmula #2: Pergunta Direta
Exemplo: "Você Quer Ganhar Mais R$5.000/mês com Marketing Digital?"

# Fórmula #3: "Segredos de..."
Exemplo: "Os 7 Segredos que os Melhores CEOs Nunca Contam"

# Fórmula #4: Prova Social
Exemplo: "3.847 Empreendedores Já Aplicaram Este Método"

# Fórmula #5: Urgência + Escassez
Exemplo: "Últimas 5 Vagas com 50% de Desconto"

# Fórmula #6: Benefício Claro
Exemplo: "Aprenda Copywriting em 10 Horas e Dobre Suas Vendas"`,
        example: "Teste 3-5 headlines diferentes para cada campanha. A Caples recomenda pelo menos 5 headlines por copy."
    },
    "Collier Letter Book (Robert Collier - Copywriting Clássico)": {
        framework: "Collier Letter Book",
        structure: `# 1. Entre na Conversa Mental
Use a linguagem e dores que o prospect já está pensando.
Exemplo: "Você trabalha 10 horas por dia mas ainda não consegue quitar as contas?"

# 2. Express Escassez
Limite o tempo ou quantidade.
Exemplo: "Esta oferta termina em 48 horas"

# 3. Dê a Razão do Desconto
Por que o preço está abaixo do mercado?
Exemplo: "Abrimos 50 vagas para testar o método em novos mercados"

# 4. Descreva o Benefício Emocional
Não fale do produto, fale do resultado emocional.
Exemplo: "Imagine acordar sem preocupações com dinheiro..."

# 5. Seja Pessoal
Use "você" e "nós" para criar conexão.
Exemplo: "Você não está sozinho nessa. Junte-se a nós."`,
        example: "Ideal para copy de produtos com forte componente emocional ou de transformação pessoal."
    },
    "Hopkins Scientific Advertising (Claude Hopkins - Científico)": {
        framework: "Hopkins Scientific Advertising",
        structure: `# 1. Teste Tudo
Varie headlines, ofertas, layouts. Anote o que funciona.

# 2. Especificidade Verdadeira
Não diga "muitas pessoas", diga "3.247 pessoas".
Exemplo: "Nosso curso tem 4.8 de 5 estrelas em 1.234 avaliações"

# 3. Reason Why
Sempre dê a razão real para acreditar.
Exemplo: "Por que nosso método funciona? Porque usamos dados reais de 10 anos de mercado"

# 4. Garantia Forte
Reduza o risco ao máximo.
Exemplo: "Se não gostar, devolvemos 100% do seu dinheiro em até 30 dias"

# 5. CTA Imediato
Diga exatamente o que fazer agora.
Exemplo: "Clique no botão abaixo e garanta sua vaga com 50% OFF"`,
        example: "Use para produtos com forte evidência científica ou dados comprováveis."
    },
    "Sugarman Slippery Slide (Joseph Sugarman - Copywriting Psychology)": {
        framework: "Sugarman Slippery Slide",
        structure: `# 1. O Hook (Gancho Inicial)
Uma frase que capture a atenção imediatamente.
Exemplo: "Este erro está custando R$10.000/mês para 80% das empresas"

# 2. O Slide (Tobogã)
Cada parágrafo leva ao próximo de forma natural.
Use transições curtas e retorne sempre à curiosidade.

# 3. A História Pessoal
Conecte emocionalmente através de vulnerabilidade.
Exemplo: "Eu estava falindo até descobrir esta técnica..."

# 4. A Prova Social
Testemunhos, estudos de caso, números.
Exemplo: "Veja o que clientes como Maria e João estão dizendo..."

# 5. A Oferta Irresistível
Combine benefício, urgência e garantia.
Exemplo: "Garanta o curso com 60% OFF + bônus de R$497,00 + garantia de 30 dias"`,
        example: "Perfeito para produtos com forte história de marca ou founder's story."
    },
    "Schwartz Desire + Mechanism (Eugene Schwartz - Desejo + Mecanismo)": {
        framework: "Schwartz Desire + Mechanism",
        structure: `# 1. Identifique o Desejo do Mercado
Qual é a dor ou desejo principal do seu público?
Exemplo: "Ganhar mais dinheiro sem trabalhar mais horas"

# 2. Ofereça um Mecanismo Único
Um método ou abordagem que ninguém mais tem.
Exemplo: "Nosso método de automação de vendas via IA"

# 3. Prove que o Mecanismo Funciona
Dados, estudos, casos de uso.
Exemplo: "Testado em 1.500 campanhas com ROI médio de 420%"

# 4. Crie Urgência Real
Por que comprar agora e não depois?
Exemplo: "Preço de lançamento termina em 72 horas"

# 5. Facilite a Ação
CTA claro e simples.
Exemplo: "Clique aqui, preencha seus dados e comece em 24h"`,
        example: "Use para produtos com mecanismo único ou tecnologia inovadora."
    },
    "Halbert Star Story Solution (Gary Halbert - SSS Framework)": {
        framework: "Halbert Star Story Solution",
        structure: `# STAR (Estrela)
Apresente seu produto/herói.
Exemplo: "Apresentando o Curso de Copywriting para Empreendedores"

# STORY (História)
Conte a história de quem usa ou por que existe.
Exemplo: "Criado após analisar 10.000 campanhas de vendas..."

# SOLUTION (Solução)
Mostre como o produto resolve o problema.
Exemplo: "Agora você pode criar seu próprio funil de vendas..."

# CTA
O que fazer agora.
Exemplo: "Inscreva-se agora e ganhe bônus de R$1.000"`,
        example: "Ideal para lançamentos ou produtos com narrativa forte."
    },
    "Ogilvy Headline First (David Ogilvy - 80% no Headline)": {
        framework: "Ogilvy Headline First",
        structure: `# Regra #1: O Headline É TUDO
80% do esforço deve ir para criar o headline perfeito.

# Regra #2: Prometa um Benefício Claro
Não diga "melhor curso", diga "Curso que aumentou vendas em 300%"

# Regra #3: Use Números
Números são mais específicos que adjetivos.
Exemplo: "5 Técnicas de Copywriting que Dobram Conversões"

# Regra #4: Crie Curiosidade
Uma lacuna que force a leitura.
Exemplo: "O erro #1 que mata suas vendas (e como evitar)"

# Regra #5: Fale para 1 Pessoa
Use "você" e "seu"
Exemplo: "Você Quer Aumentar Suas Vendas em 30 Dias?"`,
        example: "Use quando o headline é o ponto de decisão principal (ex: anúncios, e-mail subject)."
    },
    "Caples Direct Response Formulas (John Caples - AIDA + Prova)": {
        framework: "Caples Direct Response Formulas",
        structure: `# AIDA + Prova Social:
A = Attention: Headline com curiosidade ou problema
I = Interest: Desenvolva a curiosidade com dados
D = Desire: Mostre o benefício emocional
A = Action: CTA claro

Exemplo de copy completo:

"Pare de Perder Clientes por um Só E-mail (A)

87% das empresas perdem dinheiro com e-mails mal escritos (I)

E se você pudesse escrever e-mails que convertem como um profissional? (D)

Clique aqui e comece seu teste grátis agora (A)

Comprovado por 3.421 empreendedores (Prova)"`,
        example: "Combine AIDA com prova social para criar respostas diretas convincentes."
    },
    "Collier Enter Conversation (Robert Collier - Entre na Conversa Mental)": {
        framework: "Collier Enter Conversation",
        structure: `# 1. Encontre a Conversa Mental
O que o prospect já está pensando?
Exemplo: "Não consigo pagar as contas" → "O que eu mudaria se tivesse mais dinheiro?"

# 2. Entre Nessa Conversa
Use as mesmas palavras e preocupações.
Exemplo: "Sabemos que essa preocupação é real..."

# 3. Mostre que Entende
Valide a dor, não a ignore.
Exemplo: "Entendemos que você já tentou outras soluções..."

# 4. Ofereça uma Saída
Mostre que existe uma solução.
Exemplo: "Mas este método é diferente porque..."

# 5. Crie Confiança
Prova social ou garantia.
Exemplo: "Junte-se a 1.500+ pessoas que já mudaram de vida"`,
        example: "Ideal para produtos que resolvem dores emocionais profundas."
    },
    "Hopkins Reason Why (Claude Hopkins - Razão Real)": {
        framework: "Hopkins Reason Why",
        structure: `# 1. Dê a Razão Verdadeira
Por que o produto funciona?
Exemplo: "Porque usamos uma combinação única de pesquisa e prática"

# 2. Seja Específico na Razão
Não diga "porque é bom", diga "porque contém 15 capítulos testados por 1.000+ alunos"

# 3. Cite Dados ou Autoridades
Apoie a razão com fatos.
Exemplo: "Segundo pesquisa da Harvard Business Review..."

# 4. Transforme a Razão em Benefício
Exemplo: "15 capítulos testados = você economiza 3 anos de tentativa e erro"

# 5. CTA Baseado na Razão
Exemplo: "Garanta seu curso com razão real para aprender copywriting"`,
        example: "Use para produtos com explicação científica ou lógica clara."
    },
    "Sugarman Emotional Logic (Joseph Sugarman - Lógica Emocional)": {
        framework: "Sugarman Emotional Logic",
        structure: `# 1. Gancho Emocional
Toque a emoção antes da lógica.
Exemplo: "Você sente que está trabalhando duro e não saindo do lugar?"

# 2. Lógica como Justificativa
Depois do gancho emocional, justifique racionalmente.
Exemplo: "Porque o mercado evolui e quem não adapta, perde"

# 3. Prova Social Emocional
Depoimentos que toquem a emoção.
Exemplo: "Como Maria, que quase desistiu mas encontrou a solução"

# 4. Oferta que Resolve a Emoção
Exemplo: "Este curso vai te dar a certeza que você precisa"

# 5. CTA que Apela para a Ação
Exemplo: "Pare de adiar e comece a agir hoje"`,
        example: "Perfeito para produtos de transformação pessoal ou cursos."
    },
    "Schwartz Market Sophistication (Eugene Schwartz - 5 Níveis)": {
        framework: "Schwartz Market Sophistication",
        structure: `# Nível 1: Primeira Solução
O mercado nunca viu essa solução.
Exemplo: "O primeiro método de copywriting com IA"

# Nível 2: Solução Melhorada
A solução existe mas sua versão é superior.
Exemplo: "Nossa versão do método X é 3x mais eficiente"

# Nível 3: Alta Concorrência
Muitos produtos similares no mercado.
Exemplo: "Cursos de copywriting são comuns, mas nenhum tem garantia de resultados"

# Nível 4: Mais Disputa
Quase impossível diferenciar pelo benefício direto.
Exemplo: "Não é sobre aprender copywriting, é sobre aplicar com garantia"

# Nível 5: Saturado
O mercado não acredita mais em promessas.
Exemplo: "Chega de promessas. Veja os resultados reais de nossos alunos"`,
        example: "Analise o nível de sofisticação do seu mercado antes de escolher a abordagem."
    },
    "Killer Headlines 101 (Blend: Caples + Ogilvy + Schwartz)": {
        framework: "Killer Headlines 101",
        structure: `# Fórmula 1: "Como" + Resultado + Tempo
Exemplo: "Como Escrever Copy que Converte em 30 Dias"

# Fórmula 2: Número + Benefício + Urgência
Exemplo: "5 Técnicas de Copywriting que Funcionam em 7 Dias"

# Fórmula 3: Pergunta Provocativa
Exemplo: "Por que 90% das Copies Falham?"

# Fórmula 4: Promessa + Razão
Exemplo: "Dobre Suas Vendas com Este Método Comprovado"

# Fórmula 5: Segredo + Curiosidade
Exemplo: "O Segredo do Copywriting que 99% Ignora"

# Regra de Ouro: Teste 5 Headlines por Copy
Use ferramentas de A/B testing para descobrir qual funciona melhor.`,
        example: "Use para campanhas de alta performance onde o headline define o sucesso."
    },
    "Bullet Point Mastery (Schwartz + Halbert - Bullets que Vendem)": {
        framework: "Bullet Point Mastery",
        structure: `# Regra #1: Cada Bullet é uma Micro-Venda
Cada bullet deve vender o benefício, não a característica.

# Regra #2: Use Números nos Bullets
Exemplo: "✓ Descubra as 3 frases que triplicam cliques"

# Regra #3: Bullet com Curiosidade
Exemplo: "✓ O erro #1 que mata 80% das campanhas (e como evitar)"

# Regra #4: Bullet com Urgência
Exemplo: "✓ Última chance de acessar o módulo bônus por R$1"

# Regra #5: Máximo 5 Bullets por Seção
Mais que isso dilui a força de cada bullet.`,
        example: "Use para páginas de vendas ou e-mails de lançamento com muitos benefícios."
    },
    "Guarantee Architecture (Halbert + Hormozi - Garantias Irresistíveis)": {
        framework: "Guarantee Architecture",
        structure: `# 1. Garantia de Risco Zero
Exemplo: "Se não gostar, devolvemos 100% em até 60 dias"

# 2. Garantia Condicional
Exemplo: "Se não tiver resultados em 30 dias aplicando o método, reembolsamos"

# 3. Garantia de Resultados Específicos
Exemplo: "Garantimos aumento de 50% nas vendas em 60 dias ou devolvemos tudo"

# 4. Garantia de Satisfação Total
Exemplo: "Se não ficar 100% satisfeito, devolvemos seu dinheiro sem perguntas"

# 5. Stack de Garantias (múltiplas garantias)
Exemplo: "Garantia de 60 dias + Garantia de satisfação + Garantia de resultados"`,
        example: "Use quando a incerteza é a principal objeção de compra."
    },
    "Objection Crusher (Sandler + Challenger - Destrua Objeções)": {
        framework: "Objection Crusher",
        structure: `# 1. Antecipe a Objeção
Ejemplo: "Talvez você esteja pensando: 'Isso não funciona para meu nicho'"

# 2. Validar a Objeção
Exemplo: "Entendemos que cada mercado é único..."

# 3. Desafie a Objeção
Exemplo: "Mas nossa metodologia já foi testada em 12 nichos diferentes"

# 4. Prove com Dados
Exemplo: "Em 2023, 87% dos clientes em nichos diferentes obtiveram resultados"

# 5. Transforme em Oportunidade
Exemplo: "Na verdade, este é justamente o diferencial do nosso método"`,
        example: "Use para produtos com muitas objeções comuns (preço, tempo, necessidade, confiança)."
    },
    "CTA Velocity (Sugarman + Schwartz - Chamadas que Convertem)": {
        framework: "CTA Velocity",
        structure: `# 1. CTA com Verbo de Ação
Exemplo: "Garante", "Descubra", "Aproveite", "Inscreva-se"

# 2. CTA com Urgência
Exemplo: "Garante Agora", "Inscreva-se Hoje", "Compre Antes de Acabar"

# 3. CTA com Benefício Claro
Exemplo: "Comece a Ganhar Mais", "Aprenda Copywriting Grátis"

# 4. CTA + Escassez
Exemplo: "Garante Sua Vaga Antes que Acabe"

# 5. CTA + Garantia
Exemplo: "Compre Agora com 30 Dias de Garantia"

# Fórmula de CTA Velocidade:
[Verbo de Ação] + [Benefício] + [Urgência] + [Garantia/ Escassez]
Exemplo: "Garante Agora Seus Resultados com 60 Dias de Garantia"`,
        example: "Use para botões, banners e chamadas finais de e-mail/LP."
    },
    "Email Sequence Alchemy (Collier + Halbert - Sequências que Nutrem)": {
        framework: "Email Sequence Alchemy",
        structure: `# E-mail 1: Boas-vindas (valor imediato)
Exemplo: "Bem-vindo! Aqui está seu guia exclusivo de copywriting"

# E-mail 2: Educacional (construa autoridade)
Exemplo: "A técnica #1 que transformou 1.000 copywriters"

# E-mail 3: Storytelling (crie conexão)
Exemplo: "Como eu passei de desempregado a mentor de copywriting"

# E-mail 4: Oferta + Escassez
Exemplo: "Últimas 24h para garantir o curso com 50% OFF"

# E-mail 5: Última Chance
Exemplo: "Final da oferta: não perca essa oportunidade"

# Regra de Ouro: Entregue valor nos primeiros e-mails antes de vender
80% valor / 20% venda.`,
        example: "Use para sequências de bem-vindo ou lançamentos de produtos."
    },
    "VSL Script Anatomy (Benson + Georgi + Hormozi - Anatomia Completa)": {
        framework: "VSL Script Anatomy",
        structure: `# 1. O Hook (30 segundos)
Exemplo: "Você quer ganhar mais sem trabalhar mais?"

# 2. A Promessa (1 minuto)
Exemplo: "Vou te mostrar como lucrar R$10.000/mês com automação"

# 3. A História Pessoal (2-3 minutos)
Exemplo: "Há 2 anos eu estava falindo até descobrir..."

# 4. O Método (5-10 minutos)
Exemplo: "Funciona assim: primeiro você... segundo..."

# 5. Prova Social (2-3 minutos)
Exemplo: "Como Maria que passou de R$2.000 para R$15.000/mês"

# 6. A Oferta (2-3 minutos)
Exemplo: "Hoje você pode acessar tudo por apenas R$997"

# 7. Garantia + CTA
Exemplo: "60 dias de garantia ou seu dinheiro de volta. Clique abaixo para garantir"`,
        example: "Use para vídeos de vendas de produtos digitais de alto valor."
    },
    "Landing Page Conversion Stack (StoryBrand + Schwartz + Ogilvy)": {
        framework: "Landing Page Conversion Stack",
        structure: `# 1. Headline Principal (Ogilvy)
Exemplo: "Aprenda Copywriting e Dobre Suas Vendas em 30 Dias"

# 2. Subheadline (Schwartz)
Exemplo: "Mesmo que você nunca tenha escrito uma palavra na vida"

# 3. Problema (StoryBrand)
Exemplo: "O problema não é você. É o método que ninguém te ensinou"

# 4. Solução (Schwartz)
Exemplo: "Nosso curso de copywriting resolve isso com métodos comprovados"

# 5. Benefícios em Bullets
Exemplo: "✓ Escreva copy que converte\n✓ Economize anos de tentativa e erro\n✓ Garanta resultados em 30 dias"

# 6. Prova Social
Exemplo: "1.500+ alunos já aplicaram com sucesso"

# 7. Oferta + Urgência
Exemplo: "Apenas hoje: 50% OFF + bônus de R$997"

# 8. CTA Final
Exemplo: "Garante Agora Minha Vaga"`,
        example: "Use para páginas de vendas de cursos, mentorias ou produtos digitais."
    }
};
