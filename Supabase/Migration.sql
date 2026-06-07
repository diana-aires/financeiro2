-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.perfis (
  id uuid NOT NULL,
  nome text,
  email text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT perfis_pkey PRIMARY KEY (id),
  CONSTRAINT perfis_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.categorias (
  id integer NOT NULL DEFAULT nextval('categorias_id_seq'::regclass),
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['receita'::text, 'despesa'::text])),
  nome text NOT NULL,
  classificacao text NOT NULL CHECK (classificacao = ANY (ARRAY['fixa'::text, 'variavel'::text])),
  icone text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categorias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lancamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['receita'::text, 'despesa'::text])),
  cat text NOT NULL,
  descricao text DEFAULT ''::text,
  valor numeric NOT NULL CHECK (valor >= 0::numeric),
  parcelas integer CHECK (parcelas IS NULL OR parcelas > 0),
  parcela_atual integer CHECK (parcela_atual IS NULL OR parcela_atual > 0),
  cartao text,
  observacao text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  data_vencimento date NOT NULL,
  data_compra date NOT NULL,
  CONSTRAINT lancamentos_pkey PRIMARY KEY (id),
  CONSTRAINT lancamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.metas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0::numeric),
  atual numeric DEFAULT 0 CHECK (atual >= 0::numeric),
  prazo text,
  cor text DEFAULT '#1E3A8A'::text,
  ativa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT metas_pkey PRIMARY KEY (id),
  CONSTRAINT metas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cartoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  bandeira text,
  limite numeric,
  dia_fatura integer CHECK (dia_fatura >= 1 AND dia_fatura <= 31),
  cor text DEFAULT '#7C3AED'::text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cartoes_pkey PRIMARY KEY (id),
  CONSTRAINT cartoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
