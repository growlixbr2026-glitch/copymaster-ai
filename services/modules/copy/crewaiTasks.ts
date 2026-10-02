// ═══════════════════════════════════════════════════════════════════════════
// CREWAI TASK DEFINITIONS — Estrutura de tasks sequenciais estilo crewAI
// Cada task = 1 chamada callAI com systemInstruction = agent role/goal/backstory
// Padrão adotado do crewAI (Apache 2.0): task decomposition + expected_output
// ═══════════════════════════════════════════════════════════════════════════

export interface CrewAITask {
  id: string;
  agentRole: string;
  agentGoal: string;
  agentBackstory: string;
  description: string;
  expectedOutput: string;
  dependsOn?: string[];
  responseSchema?: any;
}

export interface CrewAIWorkflow {
  name: string;
  tasks: CrewAITask[];
}

// VSL COMPLETA via Crew (4 agents sequenciais)
export const VSL_CREW_WORKFLOW: CrewAIWorkflow = {
  name: 'vsl_full_crew',
  tasks: [
    {
      id: 'research',
      agentRole: 'Market Research Analyst',
      agentGoal: 'Uncover the target audience deepest pains, desires, objections, and exact language patterns.',
      agentBackstory: "You've spent 15 years doing qualitative research for direct response companies. You know how to find the 'voice of customer' in reviews, forums, support tickets, and sales calls. You don't guess — you extract exact phrases prospects use.",
      description: 'Research the target audience for {productName}. Context: {context}. Find 5-7 specific pain points with EXACT phrasing from real customers. Identify top 3 desires, 5 objections, and 10 voice-of-customer phrases. LANGUAGE: {language}',
      expectedOutput: 'JSON: {pains: string[], desires: string[], objections: string[], voiceOfCustomer: string[], competitors: string[]}',
      responseSchema: {
        type: 'object',
        properties: {
          pains: { type: 'array', items: { type: 'string' } },
          desires: { type: 'array', items: { type: 'string' } },
          objections: { type: 'array', items: { type: 'string' } },
          voiceOfCustomer: { type: 'array', items: { type: 'string' } },
          competitors: { type: 'array', items: { type: 'string' } }
        },
        required: ['pains', 'desires', 'objections', 'voiceOfCustomer']
      }
    },
    {
      id: 'structure',
      agentRole: 'VSL Architect',
      agentGoal: 'Design the 12-block VSL structure with timestamps, hook variations, and open loops.',
      agentBackstory: "You've structured 200+ VSLs for 7-8 figure launches. You know the Benson, Georgi, Hormozi, Brunson architectures inside out. You design for retention — open loops every 60s, pattern interrupts, and a CTA that feels inevitable.",
      description: 'Using the research data below, design the complete 12-block VSL structure for {productName}. Include: block name, target timestamp, purpose, 3 hook variations per block, and 2 open loops to plant early.\n\nRESEARCH:\n{research.output}',
      expectedOutput: 'JSON: {blocks: [{name, timestamp, purpose, hooks: string[], openLoops: string[]}], totalEstimatedMinutes: number}',
      dependsOn: ['research'],
      responseSchema: {
        type: 'object',
        properties: {
          blocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                timestamp: { type: 'string' },
                purpose: { type: 'string' },
                hooks: { type: 'array', items: { type: 'string' } },
                openLoops: { type: 'array', items: { type: 'string' } }
              },
              required: ['name', 'timestamp', 'purpose']
            }
          },
          totalEstimatedMinutes: { type: 'number' }
        },
        required: ['blocks', 'totalEstimatedMinutes']
      }
    },
    {
      id: 'script',
      agentRole: 'Direct Response Copywriter (VSL Specialist)',
      agentGoal: 'Write the full VSL script — teleprompter-ready, spoken language, rhythmic punctuation.',
      agentBackstory: "You've written 500+ VSL scripts for health, finance, info-products. You write for the EAR: short sentences, rhythmic punctuation, conversational tone. You know every framework (Benson, Georgi, Hormozi, Brunson) and when to blend them. No slide markers, no scene directions — pure spoken copy.",
      description: 'Write the COMPLETE VSL script for {productName} following the structure below. Each block 150-300 words. Teleprompter-ready: spoken language, rhythmic punctuation, short sentences. LANGUAGE: {language}. PROIBIDO markdown, "Cena", "Slide", "Corta". Include [BLOCK: name] markers before each section.\n\nSTRUCTURE:\n{structure.output}\n\nRESEARCH:\n{research.output}',
      expectedOutput: 'FULL SCRIPT TEXT with [BLOCK: name] markers before each section. Pure spoken copy.',
      dependsOn: ['structure']
    },
    {
      id: 'review',
      agentRole: 'Conversion Optimizer (VSL Doctor)',
      agentGoal: 'Review script for retention hooks, clear CTA, risk reversal, spoken cadence. Return annotated script + 3 specific improvements.',
      agentBackstory: "You've diagnosed and fixed 100+ underperforming VSLs. You check: hook in first 8s, open loops every 60s, clear unique mechanism, proof stack credibility, offer stack value, risk reversal strength, CTA clarity. You give surgical feedback — not opinions.",
      description: 'Review the VSL script below for: 1) Hook in first 8 seconds 2) Retention hooks every 60s 3) Clear unique mechanism 4) Proof stack credibility 5) Offer stack value 6) Risk reversal 7) CTA clarity 8) Spoken cadence. Return the ANNOTATED final script with [IMPROVEMENT: specific fix] markers applied directly + a final IMPROVEMENTS_SUMMARY with 3 specific fixes.\n\nSCRIPT:\n{script.output}',
      expectedOutput: 'ANNOTATED_SCRIPT with [IMPROVEMENT: specific fix] markers + IMPROVEMENTS_SUMMARY: [3 specific actionable fixes]',
      dependsOn: ['script']
    }
  ]
};

// EMAIL SEQUENCE via Crew (2 agents)
export const EMAIL_SEQUENCE_CREW_WORKFLOW: CrewAIWorkflow = {
  name: 'email_sequence_crew',
  tasks: [
    {
      id: 'strategy',
      agentRole: 'Email Sequence Strategist',
      agentGoal: 'Define the sequence type, narrative arc, and one big idea per email.',
      agentBackstory: "You've architected 100+ sequences (welcome, soap opera, PLC launch, webinar follow-up, abandoned cart, win-back). You know: one big idea per email, subject lines that create click loops, the narrative arc that moves prospect from problem to solution.",
      description: 'Define the {count}-email sequence for this offer. TIPO: {type} | PÚBLICO: {targetAudience} | CONTEXTO: {context}. Output: sequence type, narrative arc, and for each email: big idea, goal, CTA, subject line angle. LANGUAGE: {language}',
      expectedOutput: 'JSON: {sequenceType, narrativeArc, emails: [{bigIdea, goal, cta, subjectAngle}]}',
      responseSchema: {
        type: 'object',
        properties: {
          sequenceType: { type: 'string' },
          narrativeArc: { type: 'string' },
          emails: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bigIdea: { type: 'string' },
                goal: { type: 'string' },
                cta: { type: 'string' },
                subjectAngle: { type: 'string' }
              },
              required: ['bigIdea', 'goal', 'cta', 'subjectAngle']
            }
          }
        },
        required: ['sequenceType', 'narrativeArc', 'emails']
      }
    },
    {
      id: 'write',
      agentRole: 'Email Copywriter (Direct Response)',
      agentGoal: 'Write each email: subject line (3 options), preview text, body (200-400 words), PS. Conversational tone.',
      agentBackstory: "You've written 1000+ high-converting emails. You know: subject line = curiosity + benefit, preview text extends the hook, body = one idea with story, PS = secondary CTA or loop. You write like a friend, not a marketer.",
      description: 'Write all {count} emails following the strategy below. Each email: 3 subject lines, preview text, 200-400 word body, PS. TOM: {tone} | REMETENTE: {senderName}. LANGUAGE: {language}. Use CopyMaster format exactly:\n\nAssunto: [texto]\nCorpo: [texto]\n|||NOTA_DIVIDER|||\n**NOTA DO ESTRATEGISTA:** [1 frase]\n|||EMAIL_DIVIDER|||\n\nTEXTO PURO: proibido *, **, #, -, numeração, crases.\n\nSTRATEGY:\n{strategy.output}',
      expectedOutput: 'EMAILS in CopyMaster format with |||EMAIL_DIVIDER||| between emails and |||NOTA_DIVIDER||| notes',
      dependsOn: ['strategy']
    }
  ]
};

// LANDING PAGE via Crew (2 agents)
export const LANDING_PAGE_CREW_WORKFLOW: CrewAIWorkflow = {
  name: 'landing_page_crew',
  tasks: [
    {
      id: 'wireframe',
      agentRole: 'Landing Page Conversion Architect',
      agentGoal: 'Create wireframe with 7 sections: Hero, Problem, Mechanism, Benefits, Proof, Offer, FAQ. Specify word counts.',
      agentBackstory: "You've wireframed 200+ LPs for 7-figure funnels. You know the 7-section CRO structure, above-the-fold rule, skimmer-friendly headlines (<10 words), bullets = benefit + mechanism, objection-handling in FAQ.",
      description: 'Create wireframe for {productName} targeting {targetAudience}. PROMESSA: {promise} | OFERTA: {offer}. 7 sections with: section ID, headline, subheadline, word count, key points (3-5 per section). LANGUAGE: {language}',
      expectedOutput: 'JSON: {sections: [{id, headline, subheadline, wordCount, keyPoints: string[]}]}',
      responseSchema: {
        type: 'object',
        properties: {
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                headline: { type: 'string' },
                subheadline: { type: 'string' },
                wordCount: { type: 'number' },
                keyPoints: { type: 'array', items: { type: 'string' } }
              },
              required: ['id', 'headline', 'wordCount', 'keyPoints']
            }
          }
        },
        required: ['sections']
      }
    },
    {
      id: 'copy',
      agentRole: 'Direct Response Copywriter (LP Specialist)',
      agentGoal: 'Write all copy following wireframe. Headlines < 10 words. Bullets: benefit + mechanism. Proof: specific numbers.',
      agentBackstory: "You've written LP copy for 7-figure launches. You write for skimmers: headlines hook, subheads explain, bullets = benefit + mechanism, proof = specific numbers (not 'thousands' but '12,847'), FAQ handles objections, CTA is inevitable.",
      description: 'Write full LP copy for {productName} following the wireframe below. TEXTO PURO COPIA-COLA (sem markdown). Section labels in [brackets] allowed. Use [INSERIR DADO] for missing stats. No fake testimonials — [INSERIR DEPOIMENTO REAL]. LANGUAGE: {language}.\n\nWIREFRAME:\n{wireframe.output}',
      expectedOutput: 'FULL LP COPY with [SECTION: id] markers before each section. Pure text format.',
      dependsOn: ['wireframe']
    }
  ]
};

// ARTICLE via Crew (2 agents)
export const ARTICLE_CREW_WORKFLOW: CrewAIWorkflow = {
  name: 'article_crew',
  tasks: [
    {
      id: 'outline',
      agentRole: 'SEO Content Strategist',
      agentGoal: 'Create comprehensive outline matching search intent with AEO structure.',
      agentBackstory: "You've outlined 500+ articles that rank #1. You analyze: search intent (informational/commercial/transactional), PAA questions, competitor gaps, semantic keywords. Structure: H1, Hook, TOC, H2s with keywords, FAQ Schema targets, Conclusion + CTA.",
      description: 'Create detailed outline for this topic: {context}. CONTEXTO: {type} article, TOM: {tone}. Include: H1 options (3), hook angle, TOC, H2s with target keywords, PAA questions to answer, FAQ Schema candidates, conclusion CTA. LANGUAGE: {language}',
      expectedOutput: 'JSON: {h1Options: string[], hook, toc: string[], h2s: [{heading, targetKeyword, paaQuestions: string[]}], faqCandidates: string[], cta}',
      responseSchema: {
        type: 'object',
        properties: {
          h1Options: { type: 'array', items: { type: 'string' } },
          hook: { type: 'string' },
          toc: { type: 'array', items: { type: 'string' } },
          h2s: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string' },
                targetKeyword: { type: 'string' },
                paaQuestions: { type: 'array', items: { type: 'string' } }
              },
              required: ['heading', 'targetKeyword']
            }
          },
          faqCandidates: { type: 'array', items: { type: 'string' } },
          cta: { type: 'string' }
        },
        required: ['h1Options', 'hook', 'toc', 'h2s', 'cta']
      }
    },
    {
      id: 'write',
      agentRole: 'SEO Article Writer (E-E-A-T)',
      agentGoal: 'Write comprehensive article following outline. Cite sources, use [INSERIR DADO] for missing stats, FAQ Schema ready.',
      agentBackstory: "You've written 500+ ranking articles. You know: E-E-A-T = Experience (show it), Expertise (demonstrate it), Authoritativeness (cite it), Trustworthiness (prove it). You write scannable: short paragraphs, bullets, bold key terms, data-backed claims, FAQ Schema markup ready.",
      description: 'Write full article following the outline. Meta: {targetLength} chars. FONTES: cite as [FONTE N] when citeSources. TEXTO PURO COPIA-COLA. |||SCHEMA_DIVIDER||| with JSON-LD FAQ Schema. |||NOTA_DIVIDER||| strategy note. LANGUAGE: {language}.\n\nOUTLINE:\n{outline.output}',
      expectedOutput: 'FULL ARTICLE with section markers. |||SCHEMA_DIVIDER||| JSON-LD FAQ Schema. |||NOTA_DIVIDER||| Strategy note.',
      dependsOn: ['outline']
    }
  ]
};

// PRD VIBE CODING via Crew (2 agents)
export const PRD_CREW_WORKFLOW: CrewAIWorkflow = {
  name: 'prd_crew',
  tasks: [
    {
      id: 'prd_structure',
      agentRole: 'Product Architect (Vibe Coding)',
      agentGoal: 'Create PRD.md structure and tokens.json spec for AI-assisted static site generation.',
      agentBackstory: "You've shipped 50+ products using Lovable, v0, Cursor, Bolt. You know: PRD.md must be STATIC ONLY (Vercel SSG: no auth, no DB, no payments, no CMS, no blog). Stack: Astro/Next.js SSG + Tailwind. Tokens.json = design system (colors, spacing, typography, radii, shadows). Structure: Hero to Problem to Solution to Proof to How It Works to FAQ to CTA to Footer.",
      description: 'Create PRD structure for {businessName} ({niche}). PROMESSA: {promise} | PÚBLICO: {audience}. Include: all sections with detailed specs, tokens.json structure, tech stack, visual style, static integrations (webhook/WhatsApp only). LANGUAGE: {language}',
      expectedOutput: 'JSON: {prdSections: [{id, title, specs: string[]}], tokens: {colors, spacing, typography, radii, shadows}, techStack, visualStyle}',
      responseSchema: {
        type: 'object',
        properties: {
          prdSections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                specs: { type: 'array', items: { type: 'string' } }
              },
              required: ['id', 'title', 'specs']
            }
          },
          tokens: {
            type: 'object',
            properties: {
              colors: { type: 'object' },
              spacing: { type: 'object' },
              typography: { type: 'object' },
              radii: { type: 'object' },
              shadows: { type: 'object' }
            }
          },
          techStack: { type: 'string' },
          visualStyle: { type: 'string' }
        },
        required: ['prdSections', 'tokens', 'techStack']
      }
    },
    {
      id: 'prd_write',
      agentRole: 'Technical Writer (PRD for AI Agents)',
      agentGoal: 'Write production-ready PRD.md and tokens.json — explicit, unambiguous, implementation-ready.',
      agentBackstory: "You write PRDs that AI agents (Lovable, v0, Cursor) can implement without clarification. Every requirement is explicit, testable, and unambiguous. No 'user-friendly' — say 'WCAG 2.1 AA compliant'. No 'fast' — say '< 200ms TTFB'. Tokens.json uses CSS custom properties format.",
      description: 'Write complete PRD.md (markdown, PT-BR) and tokens.json following the structure below. PRD: executable requirements. Tokens: CSS custom properties format. Both ready for AI agent consumption. Use |||PRD_DIVIDER||| between them. LANGUAGE: {language}.\n\nSTRUCTURE:\n{prd_structure.output}',
      expectedOutput: 'PRD_MD|||PRD_DIVIDER|||TOKENS_JSON',
      dependsOn: ['prd_structure']
    }
  ]
};

// Mapeamento de sessão para workflow
export const CREW_WORKFLOWS: Record<string, CrewAIWorkflow> = {
  vsl: VSL_CREW_WORKFLOW,
  email: EMAIL_SEQUENCE_CREW_WORKFLOW,
  landing: LANDING_PAGE_CREW_WORKFLOW,
  article: ARTICLE_CREW_WORKFLOW,
  prd: PRD_CREW_WORKFLOW
};

export const getCrewWorkflow = (session: string): CrewAIWorkflow | undefined =>
  CREW_WORKFLOWS[session];
