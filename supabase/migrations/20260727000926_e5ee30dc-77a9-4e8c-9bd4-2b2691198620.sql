DELETE FROM public.periodizacao_semanas;
ALTER TABLE public.periodizacao_semanas DROP CONSTRAINT IF EXISTS periodizacao_semanas_semana_key;
ALTER TABLE public.periodizacao_semanas ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL;
ALTER TABLE public.periodizacao_semanas ADD CONSTRAINT periodizacao_semanas_user_semana_key UNIQUE (user_id, semana);
CREATE INDEX IF NOT EXISTS periodizacao_semanas_user_id_idx ON public.periodizacao_semanas(user_id);

DROP POLICY IF EXISTS "periodizacao leitura autenticada" ON public.periodizacao_semanas;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodizacao_semanas TO authenticated;
CREATE POLICY "periodizacao do usuario" ON public.periodizacao_semanas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.treinos DROP CONSTRAINT IF EXISTS treinos_letra_mes_referencia_key;
ALTER TABLE public.treinos ADD CONSTRAINT treinos_user_letra_mes_key UNIQUE (user_id, letra, mes_referencia);