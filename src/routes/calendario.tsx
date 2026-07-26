import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ptBR } from "date-fns/locale";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { historicoQuery } from "@/lib/dados";
import { formatarDuracao, intensidadeInfo } from "@/lib/intensidade";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário de treinos — BoraSuar" },
      {
        name: "description",
        content: "Histórico mensal dos treinos executados, com intensidade e exercícios concluídos.",
      },
      { property: "og:title", content: "Calendário de treinos — BoraSuar" },
      { property: "og:description", content: "Veja sua constância mês a mês no BoraSuar." },
    ],
  }),
  component: CalendarioPage,
});

const chaveDia = (d: Date | string) => {
  const data = typeof d === "string" ? new Date(d) : d;
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

function CalendarioPage() {
  const { data: execucoes, isLoading } = useQuery(historicoQuery);
  const [diaSelecionado, setDiaSelecionado] = useState<Date | undefined>();

  const porDia = useMemo(() => {
    const mapa = new Map<string, NonNullable<typeof execucoes>>();
    (execucoes ?? []).forEach((e) => {
      const k = chaveDia(e.data_inicio);
      mapa.set(k, [...(mapa.get(k) ?? []), e]);
    });
    return mapa;
  }, [execucoes]);

  const sessoesDoDia = diaSelecionado ? (porDia.get(chaveDia(diaSelecionado)) ?? []) : [];

  return (
    <AppShell>
      <h1 className="title-xl">Calendário</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada dia treinado mostra a intensidade e quantos exercícios você concluiu.
      </p>

      {isLoading ? (
        <Skeleton className="mt-5 h-96 w-full rounded-xl" />
      ) : (
        <Card className="mt-5 p-2">
          <Calendar
            mode="single"
            selected={diaSelecionado}
            onSelect={(d) => d && porDia.has(chaveDia(d)) && setDiaSelecionado(d)}
            locale={ptBR}
            classNames={{ day: "p-0.5 align-top" }}
            className="pointer-events-auto w-full"

            components={{
              DayButton: ({ day, ...props }) => {
                const sessoes = porDia.get(chaveDia(day.date)) ?? [];
                const maxIntensidade = Math.max(0, ...sessoes.map((s) => s.intensidade ?? 0));
                const info = intensidadeInfo(maxIntensidade);
                const feitos = sessoes.reduce(
                  (acc, s) => acc + s.execucoes_exercicio.filter((i) => i.concluido).length,
                  0,
                );
                return (
                  <button
                    {...props}
                    onClick={() => sessoes.length && setDiaSelecionado(day.date)}
                    className="flex size-full min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-sm hover:bg-secondary data-[selected-single=true]:bg-primary/20"
                  >
                    <span className={sessoes.length ? "font-semibold" : "text-muted-foreground"}>
                      {day.date.getDate()}
                    </span>
                    {!!sessoes.length && (
                      <>
                        <span className="text-base leading-none">{info?.emoji}</span>
                        <span className="text-[10px] leading-none text-muted-foreground">{feitos} ex</span>
                      </>
                    )}
                  </button>
                );
              },
            }}
          />
        </Card>
      )}

      <Dialog open={!!diaSelecionado} onOpenChange={(o) => !o && setDiaSelecionado(undefined)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {diaSelecionado?.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {sessoesDoDia.map((s) => {
              const info = intensidadeInfo(s.intensidade);
              const concluidos = s.execucoes_exercicio.filter((i) => i.concluido);
              const pulados = s.execucoes_exercicio.filter((i) => !i.concluido);
              return (
                <Card key={s.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">{s.treinos?.nome}</h3>
                    <Badge variant="secondary">
                      {info?.emoji} {info?.rotulo}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Duração {formatarDuracao(s.duracao_segundos)} · {concluidos.length} exercícios concluídos
                  </p>
                  <ul className="space-y-1 text-sm">
                    {concluidos.map((i) => (
                      <li key={i.exercicio_id}>
                        ✅ {i.exercicios?.nome}
                        {Array.isArray(i.series) && i.series.length > 0 && (
                          <span className="text-muted-foreground"> · {i.series.length} série(s) registrada(s)</span>
                        )}
                      </li>
                    ))}
                    {pulados.map((i) => (
                      <li key={i.exercicio_id} className="text-muted-foreground">
                        ⬜ {i.exercicios?.nome} (pulado)
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
