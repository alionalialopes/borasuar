import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Dumbbell, Play } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { treinosQuery, execucaoEmAbertoGlobalQuery } from "@/lib/dados";
import { intensidadeInfo } from "@/lib/intensidade";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "BoraSuar — Seus treinos da academia" },
      {
        name: "description",
        content:
          "Veja seus treinos cadastrados, exercícios, cargas de referência e comece a treinar com cronômetro.",
      },
      { property: "og:title", content: "BoraSuar — Seus treinos da academia" },
      {
        property: "og:description",
        content: "Execute treinos com cronômetro, timer de descanso e histórico de intensidade.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: treinos, isLoading } = useQuery(treinosQuery);
  const { data: emAberto } = useQuery(execucaoEmAbertoGlobalQuery);

  return (
    <AppShell>
      <h1 className="title-xl">Seus treinos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha um treino para ver os exercícios e começar.
      </p>

      {emAberto && (
        <Card className="mt-5 border-accent/60 bg-accent/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Você tem um treino em aberto</p>
              <p className="text-xs text-muted-foreground">
                {emAberto.treinos?.nome} · {emAberto.status === "pausado" ? "pausado" : "em andamento"}
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/treino/$treinoId/executar" params={{ treinoId: emAberto.treino_id }}>
                <Play className="size-4" /> Retomar
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-5 space-y-3">
        {isLoading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

        {!isLoading && !treinos?.length && (
          <Card className="p-8 text-center">
            <Dumbbell className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">Nenhum treino cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Importe um arquivo Markdown para criar seu catálogo de treinos.
            </p>
            <Button asChild className="mt-4">
              <Link to="/importar">Importar treinos</Link>
            </Button>
          </Card>
        )}

        {treinos?.map((t) => {
          const info = intensidadeInfo(t.ultimaExecucao?.intensidade);
          return (
            <Link key={t.id} to="/treino/$treinoId" params={{ treinoId: t.id }}>
              <Card className="flex items-center gap-4 p-4 transition-colors hover:border-primary/60">
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/15 font-display text-3xl text-primary">
                  {t.letra}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-xl">{t.nome}</h2>
                    <Badge variant="secondary">{t.mes_referencia}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.totalExercicios} exercício{t.totalExercicios === 1 ? "" : "s"}
                    {t.ultimaExecucao && (
                      <>
                        {" · último em "}
                        {new Date(t.ultimaExecucao.data_inicio).toLocaleDateString("pt-BR")}{" "}
                        {info?.emoji}
                      </>
                    )}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
