
CREATE TYPE public.tipo_repeticao AS ENUM ('periodizacao','fixo');
CREATE TYPE public.status_execucao AS ENUM ('em_andamento','pausado','finalizado','cancelado');

CREATE OR REPLACE FUNCTION public.set_atualizado_em() RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- TODO(auth): adicionar coluna user_id uuid + policies por usuário quando houver login.
CREATE TABLE public.treinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letra text NOT NULL,
  nome text NOT NULL,
  mes_referencia text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (letra, mes_referencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinos TO anon, authenticated;
GRANT ALL ON public.treinos TO service_role;
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treinos abertos (sem auth ainda)" ON public.treinos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_treinos_upd BEFORE UPDATE ON public.treinos FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TABLE public.periodizacao_semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana int NOT NULL UNIQUE,
  esquema text NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodizacao_semanas TO anon, authenticated;
GRANT ALL ON public.periodizacao_semanas TO service_role;
ALTER TABLE public.periodizacao_semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "periodizacao aberta (sem auth ainda)" ON public.periodizacao_semanas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.exercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id uuid NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  nome text NOT NULL,
  imagem_url text,
  video_url text,
  imagem_ilustrativa boolean NOT NULL DEFAULT false,
  tipo_repeticao public.tipo_repeticao NOT NULL DEFAULT 'fixo',
  repeticoes_texto text,
  carga_referencia_texto text,
  intervalo_segundos int,
  orientacoes text,
  observacao text,
  bi_set_grupo_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (treino_id, ordem)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercicios TO anon, authenticated;
GRANT ALL ON public.exercicios TO service_role;
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercicios abertos (sem auth ainda)" ON public.exercicios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_exercicios_upd BEFORE UPDATE ON public.exercicios FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TABLE public.execucoes_treino (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id uuid NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  status public.status_execucao NOT NULL DEFAULT 'em_andamento',
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_fim timestamptz,
  duracao_segundos int,
  intensidade int CHECK (intensidade BETWEEN 1 AND 5),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_execucao_ativa_por_treino ON public.execucoes_treino (treino_id)
  WHERE status IN ('em_andamento','pausado');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execucoes_treino TO anon, authenticated;
GRANT ALL ON public.execucoes_treino TO service_role;
ALTER TABLE public.execucoes_treino ENABLE ROW LEVEL SECURITY;
CREATE POLICY "execucoes abertas (sem auth ainda)" ON public.execucoes_treino FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pausas_execucao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_treino_id uuid NOT NULL REFERENCES public.execucoes_treino(id) ON DELETE CASCADE,
  pausado_em timestamptz NOT NULL DEFAULT now(),
  retomado_em timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pausas_execucao TO anon, authenticated;
GRANT ALL ON public.pausas_execucao TO service_role;
ALTER TABLE public.pausas_execucao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pausas abertas (sem auth ainda)" ON public.pausas_execucao FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.execucoes_exercicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_treino_id uuid NOT NULL REFERENCES public.execucoes_treino(id) ON DELETE CASCADE,
  exercicio_id uuid NOT NULL REFERENCES public.exercicios(id) ON DELETE CASCADE,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  series jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (execucao_treino_id, exercicio_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execucoes_exercicio TO anon, authenticated;
GRANT ALL ON public.execucoes_exercicio TO service_role;
ALTER TABLE public.execucoes_exercicio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "execucoes exercicio abertas (sem auth ainda)" ON public.execucoes_exercicio FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.periodizacao_semanas (semana, esquema) VALUES
  (1, '1x10 / 2x8 slow na excêntrica'),
  (2, '2x10 / 1x8'),
  (3, '3x10'),
  (4, '3x12'),
  (5, '4x10 (deload opcional)')
ON CONFLICT (semana) DO NOTHING;
