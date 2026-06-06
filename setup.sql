-- =====================================================
-- FINANCEPRO — SCHEMA COMPLETO PARA SUPABASE
-- =====================================================

-- 1. PERFIS
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  nome TEXT NOT NULL,
  classificacao TEXT NOT NULL CHECK (classificacao IN ('fixa','variavel')),
  icone TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0
);

INSERT INTO public.categorias (tipo,nome,classificacao,icone,ordem) VALUES
  ('receita','Salário CLT','fixa','ti-briefcase',1),
  ('receita','Consultoria','variavel','ti-stethoscope',2),
  ('receita','Honorários','variavel','ti-gavel',3),
  ('receita','Comissão','variavel','ti-percentage',4),
  ('receita','Projeto','variavel','ti-folder',5),
  ('receita','Curso/Treinamento','variavel','ti-school',6),
  ('receita','Prestação de Serviços','variavel','ti-tools',7),
  ('receita','Outro','variavel','ti-dots',99),
  ('despesa','Aluguel','fixa','ti-home',1),
  ('despesa','Energia','fixa','ti-bolt',2),
  ('despesa','Internet','fixa','ti-wifi',3),
  ('despesa','Assinaturas','fixa','ti-apps',4),
  ('despesa','Financiamento','fixa','ti-car',5),
  ('despesa','Empréstimo','fixa','ti-cash',6),
  ('despesa','Alimentação','variavel','ti-apple',10),
  ('despesa','Transporte','variavel','ti-bus',11),
  ('despesa','Viagem','variavel','ti-plane',12),
  ('despesa','Lazer','variavel','ti-confetti',13),
  ('despesa','Compras','variavel','ti-shopping-cart',14),
  ('despesa','Investimento','variavel','ti-building-bank',15),
  ('despesa','Saúde','variavel','ti-heart',16),
  ('despesa','Beleza','variavel','ti-sparkles',17),
  ('despesa','Insumos','variavel','ti-package',18),
  ('despesa','Doação','variavel','ti-heart-handshake',19),
  ('despesa','Outro','variavel','ti-dots',99)
ON CONFLICT DO NOTHING;

-- 3. LANCAMENTOS
CREATE TABLE IF NOT EXISTS public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  cat TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  data DATE NOT NULL,
  parcelas INTEGER CHECK (parcelas IS NULL OR parcelas > 0),
  parcela_atual INTEGER CHECK (parcela_atual IS NULL OR parcela_atual > 0),
  cartao TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. METAS
CREATE TABLE IF NOT EXISTS public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  atual NUMERIC(12,2) DEFAULT 0 CHECK (atual >= 0),
  prazo TEXT,
  cor TEXT DEFAULT '#1E3A8A',
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CARTOES
CREATE TABLE IF NOT EXISTS public.cartoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bandeira TEXT,
  limite NUMERIC(12,2),
  dia_fatura INTEGER CHECK (dia_fatura BETWEEN 1 AND 31),
  cor TEXT DEFAULT '#7C3AED',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_lancamentos_user ON public.lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON public.lancamentos(user_id, tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_parcelas ON public.lancamentos(user_id, cartao) WHERE parcelas IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_metas_user ON public.metas(user_id);

-- ROW LEVEL SECURITY
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfis_own" ON public.perfis FOR ALL USING (auth.uid()=id) WITH CHECK (auth.uid()=id);
CREATE POLICY "lancamentos_select" ON public.lancamentos FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "lancamentos_insert" ON public.lancamentos FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "lancamentos_update" ON public.lancamentos FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "lancamentos_delete" ON public.lancamentos FOR DELETE USING (auth.uid()=user_id);
CREATE POLICY "metas_own" ON public.metas FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "cartoes_own" ON public.cartoes FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "categorias_read" ON public.categorias FOR SELECT USING (true);

-- VIEWS
CREATE OR REPLACE VIEW public.v_resumo_mensal AS
SELECT user_id, TO_CHAR(data,'YYYY-MM') AS mes,
  SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END) AS total_receita,
  SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END) AS total_despesa,
  SUM(CASE WHEN tipo='receita' THEN valor ELSE -valor END) AS saldo,
  COUNT(*) AS total_lancamentos
FROM public.lancamentos GROUP BY user_id, TO_CHAR(data,'YYYY-MM') ORDER BY mes DESC;

CREATE OR REPLACE VIEW public.v_gastos_categoria AS
SELECT user_id, cat AS categoria, tipo, TO_CHAR(data,'YYYY-MM') AS mes,
  SUM(valor) AS total, COUNT(*) AS quantidade
FROM public.lancamentos GROUP BY user_id, cat, tipo, TO_CHAR(data,'YYYY-MM') ORDER BY total DESC;

CREATE OR REPLACE VIEW public.v_parcelas_ativas AS
SELECT user_id, cartao, descricao, valor AS valor_parcela, parcela_atual,
  parcelas AS total_parcelas,
  (parcelas - COALESCE(parcela_atual,1)) * valor AS valor_restante,
  ROUND((COALESCE(parcela_atual,1)::NUMERIC / parcelas)*100,1) AS progresso_pct, data
FROM public.lancamentos WHERE parcelas IS NOT NULL AND parcelas > 0
  AND (parcela_atual IS NULL OR parcela_atual <= parcelas)
ORDER BY cartao, parcela_atual;

-- FUNÇÕES E TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_lancamentos BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_metas BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_perfis BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
