import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Treino = Tables<"treinos">;
export type Exercicio = Tables<"exercicios">;
export type ExecucaoTreino = Tables<"execucoes_treino">;
export type ExecucaoExercicio = Tables<"execucoes_exercicio">;
export type Pausa = Tables<"pausas_execucao">;

export interface SerieRegistrada {
  numero: number;
  repeticoes: number | null;
  carga_kg: number | null;
  carga_banda_kg: number | null;
  observacao: string | null;
}

/** ID do usuário logado — todo registro criado pertence a ele. */
export async function idUsuarioAtual(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}


export const treinosQuery = queryOptions({
  queryKey: ["treinos"],
  queryFn: async () => {
    const { data: treinos, error } = await supabase
      .from("treinos")
      .select("*")
      .order("criado_em", { ascending: false })
      .order("ordem");

    if (error) throw error;

    const { data: exercicios, error: e2 } = await supabase
      .from("exercicios")
      .select("id, treino_id")
      .eq("ativo", true);
    if (e2) throw e2;

    const { data: execucoes, error: e3 } = await supabase
      .from("execucoes_treino")
      .select("*")
      .eq("status", "finalizado")
      .order("data_fim", { ascending: false });
    if (e3) throw e3;

    return (treinos ?? []).map((t) => ({
      ...t,
      totalExercicios: (exercicios ?? []).filter((e) => e.treino_id === t.id).length,
      ultimaExecucao: (execucoes ?? []).find((e) => e.treino_id === t.id) ?? null,
    }));
  },
});

export const periodizacaoQuery = queryOptions({
  queryKey: ["periodizacao"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("periodizacao_semanas")
      .select("*")
      .order("semana");
    if (error) throw error;
    return data ?? [];
  },
});

export function treinoQuery(treinoId: string) {
  return queryOptions({
    queryKey: ["treino", treinoId],
    queryFn: async () => {
      const { data: treino, error } = await supabase
        .from("treinos")
        .select("*")
        .eq("id", treinoId)
        .maybeSingle();
      if (error) throw error;
      const { data: exercicios, error: e2 } = await supabase
        .from("exercicios")
        .select("*")
        .eq("treino_id", treinoId)
        .eq("ativo", true)
        .order("ordem");
      if (e2) throw e2;
      return { treino, exercicios: exercicios ?? [] };
    },
  });
}

export function execucaoAbertaQuery(treinoId: string) {
  return queryOptions({
    queryKey: ["execucao-aberta", treinoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("execucoes_treino")
        .select("*")
        .eq("treino_id", treinoId)
        .in("status", ["em_andamento", "pausado"])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export const execucaoEmAbertoGlobalQuery = queryOptions({
  queryKey: ["execucao-aberta-global"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("execucoes_treino")
      .select("*, treinos(*)")
      .in("status", ["em_andamento", "pausado"])
      .order("data_inicio", { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },
});

export function sessaoQuery(execucaoId: string) {
  return queryOptions({
    queryKey: ["sessao", execucaoId],
    queryFn: async () => {
      const { data: execucao, error } = await supabase
        .from("execucoes_treino")
        .select("*")
        .eq("id", execucaoId)
        .maybeSingle();
      if (error) throw error;
      const { data: pausas, error: e2 } = await supabase
        .from("pausas_execucao")
        .select("*")
        .eq("execucao_treino_id", execucaoId)
        .order("pausado_em");
      if (e2) throw e2;
      const { data: itens, error: e3 } = await supabase
        .from("execucoes_exercicio")
        .select("*")
        .eq("execucao_treino_id", execucaoId);
      if (e3) throw e3;
      return { execucao, pausas: pausas ?? [], itens: itens ?? [] };
    },
  });
}

export const historicoQuery = queryOptions({
  queryKey: ["historico"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("execucoes_treino")
      .select("*, treinos(letra, nome), execucoes_exercicio(concluido, series, exercicio_id, exercicios(nome))")
      .eq("status", "finalizado")
      .order("data_inicio", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export function segundosDecorridos(
  execucao: Pick<ExecucaoTreino, "data_inicio" | "data_fim" | "status">,
  pausas: Pick<Pausa, "pausado_em" | "retomado_em">[],
  agora = Date.now(),
) {
  const inicio = new Date(execucao.data_inicio).getTime();
  const fim = execucao.data_fim ? new Date(execucao.data_fim).getTime() : agora;
  let pausado = 0;
  for (const p of pausas) {
    const ini = new Date(p.pausado_em).getTime();
    const ret = p.retomado_em ? new Date(p.retomado_em).getTime() : fim;
    pausado += Math.max(0, ret - ini);
  }
  return Math.max(0, Math.floor((fim - inicio - pausado) / 1000));
}
