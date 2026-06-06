# FinancePro

Gestão financeira pessoal com autenticação, parcelas de cartão, financiamento e IA.

## Stack
- **Frontend:** React 18 + Vite
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **IA:** Claude API (Anthropic)
- **Deploy:** Vercel

## Setup

### 1. Supabase
- Crie projeto em [supabase.com](https://supabase.com)
- Execute `setup.sql` no SQL Editor
- Authentication > Providers > Email > desative "Confirm email"
- Copie URL e anon key em Settings > API

### 2. Ambiente
```bash
cp .env.example .env
# edite com suas credenciais
```

### 3. Rodar local
```bash
npm install
npm run dev
```

### 4. Deploy Vercel
1. Suba para GitHub
2. Importe em [vercel.com/new](https://vercel.com/new)
3. Adicione variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
4. Deploy

## Funcionalidades
- Login/cadastro por e-mail
- Receitas fixas (CLT) e variáveis (consultoria, honorários...)
- Despesas: aluguel, financiamento, insumos, doação, empréstimo...
- Parcelas por cartão de crédito (Nubank, Inter, C6...)
- Edição, duplicação e exclusão de lançamentos
- Metas financeiras com aportes
- Dashboard com KPIs e indicadores
- Consultora IA (Claude)
- Row Level Security (dados isolados por usuário)

## Banco de dados
- 5 tabelas (perfis, lancamentos, metas, cartoes, categorias)
- 25 categorias pré-cadastradas
- 3 views (resumo mensal, gastos por categoria, parcelas ativas)
- Triggers automáticos (perfil no cadastro, updated_at)
- 5 índices de performance
