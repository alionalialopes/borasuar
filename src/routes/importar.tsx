import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { parseTreinosMarkdown, resolverBiSets, type TreinoParseado } from "@/lib/markdown-parser";

export const Route = createFileRoute("/importar")({
  head: () => ({
    meta: [
      { title: "Importar treinos em Markdown — BoraSuar" },
      {
        name: "description",
        content: "Envie seu arquivo .md e atualize o catálogo de treinos e exercícios em lote.",
      },
      { property: "og:title", content: "Importar treinos em Markdown — BoraSuar" },
      { property: "og:description", content: "Pré-visualize as mudanças antes de confirmar a importação." },
    ],
  }),
  component: ImportarPage,
});

type Diff = {
  treino: TreinoParseado;
  situacaoTreino: "novo" | "atualizado";
  novos: string[];
  atualizados: string[];
  desativados: string[];
};

async function calcularDiffs(treinos: TreinoParseado[]): Promise<Diff[]> {
  const out: Diff[] = [];
  for (const t of treinos) {
    const { data: existente } = await supabase
      .from("treinos")
      .select("id")
      .eq("letra", t.letra)
      .eq("mes_referencia", t.mes_referencia)
      .maybeSingle();

    let novos = t.exercicios.map((e) => `${e.ordem}. ${e.nome}`);
    let atualizados: string[] = [];
    let desativados: string[] = [];

    if (existente) {
      const { data: atuais } = await supabase
        .from("exercicios")
        .select("ordem, nome, ativo")
        .eq("treino_id", existente.id);
      const mapa = new Map((atuais ?? []).map((e) => [e.ordem, e]));
      novos = [];
      t.exercicios.forEach((e) => {
        const rotulo = `${e.ordem}. ${e.nome}`;
        if (mapa.has(e.ordem)) atualizados.push(rotulo);
        else novos.push(rotulo);
      });
      desativados = (atuais ?? [])
        .filter((a) => a.ativo && !t.exercicios.some((e) => e.ordem === a.ordem))
        .map((a) => `${a.ordem}. ${a.nome}`);
    }

    out.push({
      treino: t,
      situacaoTreino: existente ? "atualizado" : "novo",
      novos,
      atualizados,
      desativados,
    });
  }
  return out;
}

function ImportarPage() {
  const queryClient = useQueryClient();
  const [treinos, setTreinos] = useState<TreinoParseado[] | null>(null);
  const [diffs, setDiffs] = useState<Diff[] | null>(null);
  const [analisando, setAnalisando] = useState(false);

  const onArquivo = async (file: File) => {
    setAnalisando(true);
    try {
      const texto = await file.text();
      const parseados = parseTreinosMarkdown(texto);
      if (!parseados.length) {
        toast.error("Nenhum treino encontrado no arquivo", {
          description: "O arquivo precisa conter blocos iniciados por “# TREINO X - MM/AAAA”.",
        });
        return;
      }
      setTreinos(parseados);
      setDiffs(await calcularDiffs(parseados));
    } catch (e) {
      toast.error("Falha ao ler o arquivo", { description: (e as Error).message });
    } finally {
      setAnalisando(false);
    }
  };

  const importar = useMutation({
    mutationFn: async () => {
      if (!treinos) return;
      // Periodização: seed único (global), atualizado apenas se vier no arquivo.
      const periodizacao = treinos.find((t) => t.periodizacao.length)?.periodizacao ?? [];
      if (periodizacao.length) {
        await supabase
          .from("periodizacao_semanas")
          .upsert(periodizacao, { onConflict: "semana" });
      }

      for (const t of treinos) {
        const { data: treino, error } = await supabase
          .from("treinos")
          .upsert(
            {
              letra: t.letra,
              nome: t.nome,
              mes_referencia: t.mes_referencia,
              ordem: t.ordem,
              ativo: true,
            },
            { onConflict: "letra,mes_referencia" },
          )
          .select()
          .single();
        if (error) throw error;

        const grupos = resolverBiSets(t.exercicios);
        const linhas = t.exercicios.map((e) => ({
          treino_id: treino.id,
          ordem: e.ordem,
          nome: e.nome,
          imagem_url: e.imagem_url,
          video_url: e.video_url,
          imagem_ilustrativa: e.imagem_ilustrativa,
          tipo_repeticao: e.tipo_repeticao,
          repeticoes_texto: e.repeticoes_texto,
          carga_referencia_texto: e.carga_referencia_texto,
          intervalo_segundos: e.intervalo_segundos,
          orientacoes: e.orientacoes,
          observacao: e.observacao,
          bi_set_grupo_id: grupos[e.ordem] ?? null,
          ativo: true,
        }));

        const { error: e2 } = await supabase
          .from("exercicios")
          .upsert(linhas, { onConflict: "treino_id,ordem" });
        if (e2) throw e2;

        // soft-delete dos exercícios ausentes no novo arquivo
        const ordens = t.exercicios.map((e) => e.ordem);
        const { error: e3 } = await supabase
          .from("exercicios")
          .update({ ativo: false })
          .eq("treino_id", treino.id)
          .not("ordem", "in", `(${ordens.length ? ordens.join(",") : "-1"})`);
        if (e3) throw e3;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Importação concluída!");
      setTreinos(null);
      setDiffs(null);
    },
    onError: (e: Error) => toast.error("Erro na importação", { description: e.message }),
  });

  const avisos = (treinos ?? []).flatMap((t) => [
    ...t.avisos.map((a) => `${t.nome}: ${a}`),
    ...t.exercicios.flatMap((e) => e.avisos.map((a) => `${t.nome} · ${e.ordem}. ${e.nome}: ${a}`)),
  ]);

  return (
    <AppShell>
      <h1 className="title-xl">Importar treinos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Envie um arquivo <code>.md</code> no formato do seu treinos.md. Nada é gravado antes da confirmação.
      </p>

      <Card className="mt-5 p-6 text-center">
        <FileUp className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Selecione o arquivo Markdown</p>
        <Input
          type="file"
          accept=".md,text/markdown"
          className="mx-auto mt-4 max-w-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onArquivo(f);
          }}
        />
        {analisando && <p className="mt-3 text-sm text-muted-foreground">Analisando arquivo…</p>}
      </Card>

      {!!avisos.length && (
        <Card className="mt-4 border-accent/60 bg-accent/10 p-4">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-accent" /> Blocos parcialmente interpretados
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Card>
      )}

      {diffs && (
        <>
          <h2 className="mt-6 text-2xl">Pré-visualização</h2>
          <div className="mt-3 space-y-3">
            {diffs.map((d) => (
              <Card key={`${d.treino.letra}-${d.treino.mes_referencia}`} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg">
                    {d.treino.nome} · {d.treino.mes_referencia}
                  </h3>
                  <Badge variant={d.situacaoTreino === "novo" ? "default" : "secondary"}>
                    {d.situacaoTreino === "novo" ? "Novo treino" : "Atualização"}
                  </Badge>
                </div>
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Situação</TableHead>
                      <TableHead>Exercícios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      [
                        ["Novos", d.novos],
                        ["Atualizados", d.atualizados],
                        ["Serão desativados", d.desativados],
                      ] as const
                    )
                      .filter(([, lista]) => lista.length)
                      .map(([rotulo, lista]) => (
                        <TableRow key={rotulo}>
                          <TableCell className="align-top font-medium">
                            {rotulo} ({lista.length})
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {lista.join(" · ")}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setTreinos(null);
                setDiffs(null);
              }}
            >
              Descartar
            </Button>
            <Button className="flex-1" disabled={importar.isPending} onClick={() => importar.mutate()}>
              <Upload className="size-4" /> Confirmar importação
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
