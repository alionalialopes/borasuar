-- Cleanup old open policies
DROP POLICY IF EXISTS "treinos abertos (sem auth ainda)" ON public.treinos;
DROP POLICY IF EXISTS "exercicios abertos (sem auth ainda)" ON public.exercicios;
DROP POLICY IF EXISTS "execucoes abertas (sem auth ainda)" ON public.execucoes_treino;
DROP POLICY IF EXISTS "execucoes exercicio abertas (sem auth ainda)" ON public.execucoes_exercicio;
DROP POLICY IF EXISTS "pausas abertas (sem auth ainda)" ON public.pausas_execucao;
DROP POLICY IF EXISTS "periodizacao aberta (sem auth ainda)" ON public.periodizacao_semanas;

ALTER TABLE public.treinos ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;
ALTER TABLE public.exercicios ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;
ALTER TABLE public.execucoes_treino ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;
ALTER TABLE public.execucoes_exercicio ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;
ALTER TABLE public.pausas_execucao ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;

CREATE INDEX IF NOT EXISTS treinos_user_id_idx ON public.treinos(user_id);
CREATE INDEX IF NOT EXISTS exercicios_user_id_idx ON public.exercicios(user_id);
CREATE INDEX IF NOT EXISTS execucoes_treino_user_id_idx ON public.execucoes_treino(user_id);
CREATE INDEX IF NOT EXISTS execucoes_exercicio_user_id_idx ON public.execucoes_exercicio(user_id);
CREATE INDEX IF NOT EXISTS pausas_execucao_user_id_idx ON public.pausas_execucao(user_id);

REVOKE ALL ON public.treinos FROM anon;
REVOKE ALL ON public.exercicios FROM anon;
REVOKE ALL ON public.execucoes_treino FROM anon;
REVOKE ALL ON public.execucoes_exercicio FROM anon;
REVOKE ALL ON public.pausas_execucao FROM anon;
REVOKE ALL ON public.periodizacao_semanas FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercicios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execucoes_treino TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execucoes_exercicio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pausas_execucao TO authenticated;
GRANT SELECT ON public.periodizacao_semanas TO authenticated;
GRANT ALL ON public.treinos, public.exercicios, public.execucoes_treino, public.execucoes_exercicio, public.pausas_execucao, public.periodizacao_semanas TO service_role;

CREATE POLICY "treinos do usuario" ON public.treinos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercicios do usuario" ON public.exercicios FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "execucoes do usuario" ON public.execucoes_treino FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "execucoes exercicio do usuario" ON public.execucoes_exercicio FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pausas do usuario" ON public.pausas_execucao FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "periodizacao leitura autenticada" ON public.periodizacao_semanas FOR SELECT TO authenticated
  USING (true);