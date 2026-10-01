export const PROVIDER_CONFIGS: Record<string, { name: string, url: string, defaultModel: string, link: string, description: string, howTo: string, corsWarning?: boolean }> = {
    '9router': {
        name: '9Router (Local)',
        url: 'http://localhost:20128/v1/chat/completions',
        defaultModel: 'openrouter/nvidia/nemotron-3.5-lightning:free',
        link: 'https://9router.com#providers',
        description: 'Gateway local OpenAI-compatível (npm i -g 9router). Roteia p/ 60+ provedores com fallback 3 níveis por cota. Zero fatura extra.',
        howTo: 'No terminal: npm install -g 9router && 9router (abre dashboard localhost:20128). Este app já aponta para localhost:20128/v1 — não precisa chave aqui. Dica custo 0: use modelos :free do catálogo (ex.: openrouter/google/gemma-4-26b-a4b-it:free).'
    },
    nvidia: {
        name: 'NVIDIA NIM',
        url: 'https://integrate.api.nvidia.com/v1/chat/completions',
        defaultModel: 'meta/llama-3.1-405b-instruct',
        link: 'https://build.nvidia.com/explore/reasoning',
        description: 'Modelos otimizados NVIDIA — Llama, Mistral, Nemotron.',
        howTo: 'Use NVIDIA_API do seu .env ou cadastre no Centro de Comando.'
    },
    polinai: {
        name: 'Polin AI',
        url: 'https://api.polin.ai/v1/chat/completions',
        defaultModel: 'polin/gpt-4o-mini',
        link: 'https://polin.ai/dashboard',
        description: 'Gateway brasileiro com créditos locais.',
        howTo: 'Use POLINAI_API do seu .env.'
    },
    gemini: { 
        name: 'Google Gemini',
        url: '', 
        defaultModel: 'gemini-3-flash-preview', 
        link: 'https://aistudio.google.com/app/apikey',
        description: 'Motor principal multimodal. Gratuito e ultra-rápido.',
        howTo: 'Gere sua chave no Google AI Studio.'
    },
    openai: { 
        name: 'OpenAI (GPT)',
        url: 'https://api.openai.com/v1/chat/completions', 
        defaultModel: 'gpt-4o', 
        link: 'https://platform.openai.com/api-keys',
        description: 'Padrão ouro para raciocínio lógico e instrução.',
        howTo: 'Gere sua chave em API Keys na OpenAI.',
        corsWarning: true
    },
    anthropic: {
        name: 'Anthropic (Claude)',
        url: 'https://api.anthropic.com/v1/messages',
        defaultModel: 'claude-3-5-sonnet-20241022',
        link: 'https://console.anthropic.com/settings/keys',
        description: 'IA com maior nuance linguística e escrita literária.',
        howTo: 'Obtenha sua chave no console da Anthropic.'
    },
    deepseek: {
        name: 'DeepSeek (China)',
        url: 'https://api.deepseek.com/chat/completions',
        defaultModel: 'deepseek-chat',
        link: 'https://platform.deepseek.com/api_keys',
        description: 'Alta performance asiática em lógica, código e matemática.',
        howTo: 'Crie sua chave no dashboard DeepSeek.',
        corsWarning: true
    },
    meta: {
        name: 'Meta (Llama 3.3)',
        url: 'https://api.groq.com/openai/v1/chat/completions', 
        defaultModel: 'openai/gpt-oss-20b',
        link: 'https://console.groq.com/keys',
        description: 'O rei do Open Source rodando em LPU (Velocidade Extrema).',
        howTo: 'Gere no console Groq Cloud.'
    },
    mistral: {
        name: 'Mistral AI (França)',
        url: 'https://api.mistral.ai/v1/chat/completions',
        defaultModel: 'open-mistral-7b',
        link: 'https://console.mistral.ai/',
        description: 'Soberania europeia em modelos eficientes e inteligentes.',
        howTo: 'Obtenha no console oficial Mistral.'
    },
    cohere: {
        name: 'Cohere (Enterprise)',
        url: 'https://api.cohere.ai/v1/chat',
        defaultModel: 'command-r-plus',
        link: 'https://dashboard.cohere.com/api-keys',
        description: 'Especialista em contexto empresarial e RAG de longa janela.',
        howTo: 'Acesse o dashboard Cohere.'
    },
    openrouter: {
        name: 'OpenRouter (Hub)',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: 'cohere/north-mini-code:free',
        link: 'https://openrouter.ai/keys',
        description: 'Agregador mundial. Acesse Grok, Llama e centenas de outros.',
        howTo: 'Crie sua chave unificada no OpenRouter.'
    },
    qwen: {
        name: 'Alibaba Qwen (China)',
        url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        defaultModel: 'qwen-max',
        link: 'https://dashscope.console.aliyun.com/apiKey',
        description: 'Líder em benchmarks asiáticos da Alibaba Cloud.',
        howTo: 'Acesse o portal DashScope da Alibaba.'
    },
    ernie: {
        name: 'Baidu Ernie (China)',
        url: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
        defaultModel: 'ernie-4.0',
        link: 'https://console.bce.baidu.com/iam/#/iam/apikey/list',
        description: 'IA da Baidu com alta compreensão cultural chinesa.',
        howTo: 'Acesse o Baidu Cloud Workshop.'
    },
    moonshot: {
        name: 'Moonshot Kimi (China)',
        url: 'https://api.moonshot.cn/v1/chat/completions',
        defaultModel: 'moonshot-v1-8k',
        link: 'https://platform.moonshot.cn/',
        description: 'Especialista em processar contextos massivos (Long Context).',
        howTo: 'Obtenha no console da Moonshot.'
    },
    yi: {
        name: '01.AI Yi (China)',
        url: 'https://api.lingyiwanwu.com/v1/chat/completions',
        defaultModel: 'yi-large',
        link: 'https://platform.lingyiwanwu.com/',
        description: 'IA bilíngue de alto desempenho criada por Kai-Fu Lee.',
        howTo: 'Cadastre-se na plataforma 01.AI.'
    },
    zhipu: {
        name: 'Zhipu GLM (China)',
        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        defaultModel: 'glm-4',
        link: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
        description: 'Proveniente da elite acadêmica de Tsinghua.',
        howTo: 'Acesse o portal BigModel.'
    },
    grok: {
        name: 'xAI Grok (Elon Musk)',
        url: 'https://api.x.ai/v1/chat/completions',
        defaultModel: 'grok-2-latest',
        link: 'https://console.x.ai/team/default/api-keys',
        description: 'IA com acesso em tempo real ao X (Twitter) e tom direto.',
        howTo: 'Acesse o portal xAI Console (chave formato xai-...).'
    },
    hyperclova: {
        name: 'HyperCLOVA X (Coreia)',
        url: 'https://clovastudio.ncloud.com/api/v1/chat-completions',
        defaultModel: 'HCX-003',
        link: 'https://www.ncloud.com/product/ai/clovaStudio',
        description: 'A inteligência soberana da Naver (Coreia do Sul).',
        howTo: 'Acesse via Naver Cloud Platform.'
    },
    perplexity: {
        name: 'Perplexity AI',
        url: 'https://api.perplexity.ai/chat/completions',
        defaultModel: 'llama-3.1-sonar-large-128k-online',
        link: 'https://www.perplexity.ai/settings/api',
        description: 'IA híbrida com busca em tempo real ultra-precisa.',
        howTo: 'Gere nas configurações de conta da Perplexity.'
    },
    huggingface: {
        name: 'Hugging Face (Bloom)',
        url: '',
        defaultModel: 'bigscience/bloom',
        link: 'https://huggingface.co/settings/tokens',
        description: 'O maior hub de modelos colaborativos do mundo.',
        howTo: 'Crie um token de acesso "Write" no HF.'
    },
    together: {
        name: 'Together AI (Alpaca)',
        url: 'https://api.together.xyz/v1/chat/completions',
        defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        link: 'https://api.together.xyz/settings/api-keys',
        description: 'Infraestrutura veloz para modelos Open Source.',
        howTo: 'Obtenha sua chave no Together Console.'
    },
    elevenlabs: {
        name: 'ElevenLabs (Voz)',
        url: 'https://api.elevenlabs.io/v1/text-to-speech',
        defaultModel: 'eleven_multilingual_v2',
        link: 'https://elevenlabs.io/app/settings/api-keys',
        description: 'Síntese de voz com realismo emocional inigualável.',
        howTo: 'Pegue sua API Key no perfil ElevenLabs.'
    },
    stability: {
        name: 'Stability AI (SD3)',
        url: 'https://api.stability.ai/v2beta/stable-diffusion/text-to-image',
        defaultModel: 'sd3-medium',
        link: 'https://platform.stability.ai/',
        description: 'Líder em geração de imagem Open Source.',
        howTo: 'Acesse o DreamStudio/Stability API.'
    },
    runway: {
        name: 'RunwayML (Video)',
        url: '',
        defaultModel: 'gen-3-alpha',
        link: 'https://runwayml.com/',
        description: 'Estado da arte em cinematografia gerada por IA.',
        howTo: 'Verifique acesso via portal Runway.'
    },
    groq: {
        name: 'Groq (LPU Speed)',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        defaultModel: 'openai/gpt-oss-20b',
        link: 'https://console.groq.com/keys',
        description: 'A IA mais rápida do mundo (Inferência em milissegundos).',
        howTo: 'Gere no console Groq Cloud.'
    },
    cerebras: {
        name: 'Cerebras (1M/dia)',
        url: 'https://api.cerebras.ai/v1/chat/completions',
        defaultModel: 'openai/gpt-oss-120b',
        link: 'https://cloud.cerebras.ai/',
        description: '1M tokens/dia grátis, a maior cota diária gratuita. Ultra-rápido.',
        howTo: 'Crie conta em cloud.cerebras.ai e gere a chave em API Keys (sem cartão).'
    },
    sambanova: {
        name: 'SambaNova (20/dia)',
        url: 'https://api.sambanova.ai/v1/chat/completions',
        defaultModel: 'DeepSeek-V3.1',
        link: 'https://cloud.sambanova.ai/',
        description: 'Modelos top (DeepSeek-V3.1, Llama 3.3 70B) com tier gratuito.',
        howTo: 'Cadastre-se em cloud.sambanova.ai e gere a chave (sem cartão).'
    },
    chutes: {
        name: 'Chutes.ai (livre)',
        url: 'https://api.chutes.ai/v1/chat/completions',
        defaultModel: 'deepseek-ai/DeepSeek-R1',
        link: 'https://chutes.ai/',
        description: 'Infraestrutura comunitária, DeepSeek-R1 e Llama 70B sem teto rígido.',
        howTo: 'Cadastre-se em chutes.ai e gere a chave em API Keys (sem cartão).'
    },
    siliconflow: {
        name: 'SiliconFlow',
        url: 'https://api.siliconflow.cn/v1/chat/completions',
        defaultModel: 'deepseek-ai/DeepSeek-V3',
        link: 'https://siliconflow.cn/',
        description: 'Qwen e DeepSeek com cota gratuita renovável.',
        howTo: 'Cadastre-se em siliconflow.cn e gere a chave (sem cartão).'
    },
    zai: {
        name: 'Zhipu Z.AI (GLM)',
        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        defaultModel: 'glm-4',
        link: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
        description: 'GLM da elite de Tsinghua com tier gratuito generoso.',
        howTo: 'Cadastre-se em open.bigmodel.cn e gere a chave (sem cartão).'
    },
    nebius: {
        name: 'Nebius (créditos)',
        url: 'https://api.studio.nebius.com/v1/chat/completions',
        defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        link: 'https://nebius.com/',
        description: 'Créditos recorrentes ao logar, bons modelos open.',
        howTo: 'Crie conta na Nebius e gere token no Token Factory (sem cartão).'
    },
    cloudflare: {
        name: 'Cloudflare Workers AI',
        url: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions',
        defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        link: 'https://dash.cloudflare.com/',
        description: '10k req/dia no plano gratuito da Cloudflare.',
        howTo: 'No dashboard Cloudflare, ative Workers AI e crie um API token (sem cartão). Substitua {account_id} na URL.'
    }
};
