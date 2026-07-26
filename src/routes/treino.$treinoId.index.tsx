import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImageIcon, Link2, Play, Timer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { treinoQuery, periodizacaoQuery, execucaoAbertaQuery, type Exercicio } from "@/lib/dados";

export const Route = createFileRoute("/treino/$treinoId/")({
  head: () => ({
    meta: [
      { title: "Detalhe do treino — BoraSuar" },
      { name: "description", content: "Exercícios, cargas de referência e periodização do treino." },
      { property: "og:title", content: "Detalhe do treino — BoraSuar" },
      { property: "og:description", content: "Confira os exercícios antes de começar a treinar." },
    ],
  }),
  component: DetalheTreino,
});

export function MidiaExercicio({ ex }: { ex: Exercicio }) {
  if (!ex.video_url && !ex.imagem_url) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <AspectRatio ratio={16 / 10}>
        {ex.video_url ? (
          /youtube|youtu\.be|vimeo/i.test(ex.video_url) ? (
            <iframe
              src={ex.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")}
              title={ex.nome}
              allowFullScreen
              className="size-full"
            />
          ) : (
            <video src={ex.video_url} controls className="size-full object-cover" />
          )
        ) : (
          <img
            src={ex.imagem_url!}
            alt={`Demonstração do exercício ${ex.nome}`}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </AspectRatio>
    </div>
  );
}

function DetalheTreino() {
  const { treinoId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(treinoQuery(treinoId));
  const { data: periodizacao } = useQuery(periodizacaoQuery);
  const { data: aberta } = useQuery(execucaoAbertaQuery(treinoId));

  const iniciar = useMutation({
    mutationFn: async () => {
      if (aberta) return aberta;
      const { data: existente } = await supabase
        .from("execucoes_treino")
        .select("*")
        .eq("treino_id", treinoId)
        .in("status", ["em_andamento", "pausado"])
        .maybeSingle();
      if (existente) return existente;
      const { data: nova, error } = await supabase
        .from("execucoes_treino")
        .insert({ treino_id: treinoId, status: "em_andamento" })
        .select()
        .single();
      if (error) throw error;
      return nova;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execucao-aberta"] });
      navigate({ to: "/treino/$treinoId/executar", params: { treinoId } });
    },
    onError: (e: Error) => toast.error("Não foi possível iniciar o treino", { description: e.message }),
  });

  const usaPeriodizacao = data?.exercicios.some((e) => e.tipo_repeticao === "periodizacao");
  const grupos = new Map<string, number>();
  data?.exercicios.forEach((e) => {
    if (e.bi_set_grupo_id) grupos.set(e.bi_set_grupo_id, (grupos.get(e.bi_set_grupo_id) ?? 0) + 1);
  });

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/">
          <ArrowLeft className="size-4" /> Treinos
        </Link>
      </Button>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

      {!isLoading && !data?.treino && <p className="text-muted-foreground">Treino não encontrado.</p>}

      {data?.treino && (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="title-xl">{data.treino.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {data.treino.mes_referencia} · {data.exercicios.length} exercícios
              </p>
            </div>
            <Button size="lg" onClick={() => iniciar.mutate()} disabled={iniciar.isPending}>
              <Play className="size-4" /> {aberta ? "Retomar" : "Iniciar treino"}
            </Button>
          </div>

          {usaPeriodizacao && !!periodizacao?.length && (
            <Card className="mt-5 p-4">
              <h2 className="text-lg">Periodização</h2>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Semana</TableHead>
                    <TableHead>Esquema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodizacao.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.semana}</TableCell>
                      <TableCell>{p.esquema}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <div className="mt-5 space-y-3">
            {data.exercicios.map((ex) => (
              <Card
                key={ex.id}
                className={
                  ex.bi_set_grupo_id
                    ? "border-l-4 border-l-accent p-4 space-y-3"
                    : "p-4 space-y-3"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg leading-tight">
                    <span className="mr-2 text-muted-foreground">{ex.ordem}.</span>
                    {ex.nome}
                  </h3>
                  {ex.bi_set_grupo_id && <Badge className="shrink-0">BI-SET</Badge>}
                </div>

                <MidiaExercicio ex={ex} />
                {ex.imagem_ilustrativa && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ImageIcon className="size-3.5" /> Imagem ilustrativa
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary">
                    {ex.tipo_repeticao === "periodizacao" ? "Segue a periodização" : ex.repeticoes_texto}
                  </Badge>
                  {ex.intervalo_segundos != null && (
                    <Badge variant="outline" className="gap-1">
                      <Timer className="size-3" /> {ex.intervalo_segundos}s
                    </Badge>
                  )}
                </div>

                {ex.carga_referencia_texto && (
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Última carga registrada
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {ex.carga_referencia_texto}
                    </p>
                  </div>
                )}

                {(ex.orientacoes || ex.observacao) && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="info" className="border-b-0">
                      <AccordionTrigger className="py-2 text-sm">Orientações e observações</AccordionTrigger>
                      <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                        {ex.orientacoes && <p>{ex.orientacoes}</p>}
                        {ex.observacao && (
                          <p className="flex gap-1.5">
                            <Link2 className="mt-0.5 size-3.5 shrink-0" />
                            {ex.observacao}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
