import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play, Plus, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  execucaoAbertaQuery,
  segundosDecorridos,
  sessaoQuery,
  treinoQuery,
  type Exercicio,
  type SerieRegistrada,
} from "@/lib/dados";
import { INTENSIDADES, formatarDuracao } from "@/lib/intensidade";
import { TimerDescanso, pedirPermissaoNotificacao } from "@/components/timer-descanso";

export const Route = createFileRoute("/_authenticated/treino/$treinoId/executar")({
  head: () => ({
    meta: [
      { title: "Executando treino — BoraSuar" },
      { name: "description", content: "Cronômetro, timer de descanso e marcação de exercícios concluídos." },
      { property: "og:title", content: "Executando treino — BoraSuar" },
      { property: "og:description", content: "Acompanhe o treino em tempo real no BoraSuar." },
    ],
  }),
  component: Executar,
});

const DESCANSO_PADRAO = 60;

function Executar() {
  const { treinoId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: treinoData } = useQuery(treinoQuery(treinoId));
  const { data: aberta, isLoading } = useQuery(execucaoAbertaQuery(treinoId));
  const execucaoId = aberta?.id ?? "";
  const { data: sessao } = useQuery({ ...sessaoQuery(execucaoId), enabled: !!execucaoId });

  const [agora, setAgora] = useState(() => Date.now());
  const [dialogEncerrar, setDialogEncerrar] = useState(false);
  const [intensidade, setIntensidade] = useState<string>("");
  const [seriesDe, setSeriesDe] = useState<Exercicio | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  useEffect(() => {
    pedirPermissaoNotificacao();
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["execucao-aberta"] });
    queryClient.invalidateQueries({ queryKey: ["sessao"] });
    queryClient.invalidateQueries({ queryKey: ["execucao-aberta-global"] });
  };

  const pausar = useMutation({
    mutationFn: async () => {
      if (!aberta) return;
      await supabase.from("pausas_execucao").insert({ execucao_treino_id: aberta.id });
      const { error } = await supabase
        .from("execucoes_treino")
        .update({ status: "pausado" })
        .eq("id", aberta.id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });

  const retomar = useMutation({
    mutationFn: async () => {
      if (!aberta) return;
      const emAberto = (sessao?.pausas ?? []).find((p) => !p.retomado_em);
      if (emAberto) {
        await supabase
          .from("pausas_execucao")
          .update({ retomado_em: new Date().toISOString() })
          .eq("id", emAberto.id);
      }
      const { error } = await supabase
        .from("execucoes_treino")
        .update({ status: "em_andamento" })
        .eq("id", aberta.id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });

  const alternarConcluido = useMutation({
    mutationFn: async ({ exercicioId, concluido }: { exercicioId: string; concluido: boolean }) => {
      const { error } = await supabase.from("execucoes_exercicio").upsert(
        {
          execucao_treino_id: execucaoId,
          exercicio_id: exercicioId,
          concluido,
          concluido_em: concluido ? new Date().toISOString() : null,
        },
        { onConflict: "execucao_treino_id,exercicio_id" },
      );
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const salvarSeries = useMutation({
    mutationFn: async ({ exercicioId, series }: { exercicioId: string; series: SerieRegistrada[] }) => {
      const { error } = await supabase.from("execucoes_exercicio").upsert(
        {
          execucao_treino_id: execucaoId,
          exercicio_id: exercicioId,
          series: series as unknown as never,
        },
        { onConflict: "execucao_treino_id,exercicio_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Séries registradas");
    },
  });

  const encerrar = useMutation({
    mutationFn: async () => {
      if (!aberta || !intensidade) throw new Error("Selecione a intensidade");
      const fim = new Date();
      const duracao = segundosDecorridos(
        { ...aberta, data_fim: fim.toISOString() },
        sessao?.pausas ?? [],
        fim.getTime(),
      );
      const pausaAberta = (sessao?.pausas ?? []).find((p) => !p.retomado_em);
      if (pausaAberta) {
        await supabase
          .from("pausas_execucao")
          .update({ retomado_em: fim.toISOString() })
          .eq("id", pausaAberta.id);
      }
      const { error } = await supabase
        .from("execucoes_treino")
        .update({
          status: "finalizado",
          data_fim: fim.toISOString(),
          duracao_segundos: duracao,
          intensidade: Number(intensidade),
        })
        .eq("id", aberta.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ["historico"] });
      queryClient.invalidateQueries({ queryKey: ["treinos"] });
      toast.success("Treino finalizado! 💪");
      navigate({ to: "/calendario" });
    },
    onError: (e: Error) => toast.error("Não foi possível encerrar", { description: e.message }),
  });

  const cancelar = useMutation({
    mutationFn: async () => {
      if (!aberta) return;
      const { error } = await supabase
        .from("execucoes_treino")
        .update({ status: "cancelado", data_fim: new Date().toISOString() })
        .eq("id", aberta.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast("Treino cancelado");
      navigate({ to: "/treino/$treinoId", params: { treinoId } });
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-40 w-full rounded-xl" />
      </AppShell>
    );
  }

  if (!aberta) {
    return (
      <AppShell>
        <Card className="p-8 text-center">
          <p className="font-semibold">Nenhuma sessão em andamento</p>
          <Button asChild className="mt-4">
            <Link to="/treino/$treinoId" params={{ treinoId }}>
              Voltar ao treino
            </Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  const pausado = aberta.status === "pausado";
  const decorrido = segundosDecorridos(aberta, sessao?.pausas ?? [], agora);
  const exercicios = treinoData?.exercicios ?? [];
  const itens = sessao?.itens ?? [];
  const concluidos = itens.filter((i) => i.concluido).length;

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/treino/$treinoId" params={{ treinoId }}>
          <ArrowLeft className="size-4" /> Detalhe do treino
        </Link>
      </Button>

      <Card className="sticky top-2 z-10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {treinoData?.treino?.nome} · {concluidos}/{exercicios.length} feitos
            </p>
            <p className="mono-timer text-4xl">{formatarDuracao(decorrido)}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {pausado ? (
              <Button onClick={() => retomar.mutate()}>
                <Play className="size-4" /> Retomar
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => pausar.mutate()}>
                <Pause className="size-4" /> Pausar
              </Button>
            )}
            <Button variant="default" onClick={() => setDialogEncerrar(true)}>
              <Square className="size-4" /> Encerrar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setConfirmarCancelar(true)} aria-label="Cancelar treino">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        {pausado && <Badge variant="outline" className="mt-2">Treino pausado</Badge>}
      </Card>

      <div className="mt-4 space-y-3">
        {exercicios.map((ex) => {
          const item = itens.find((i) => i.exercicio_id === ex.id);
          const series = (item?.series as unknown as SerieRegistrada[]) ?? [];
          return (
            <Card
              key={ex.id}
              className={ex.bi_set_grupo_id ? "space-y-3 border-l-4 border-l-accent p-4" : "space-y-3 p-4"}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  className="mt-1 size-5"
                  checked={!!item?.concluido}
                  onCheckedChange={(v) =>
                    alternarConcluido.mutate({ exercicioId: ex.id, concluido: v === true })
                  }
                  aria-label={`Marcar ${ex.nome} como concluído`}
                />
                <div className="min-w-0 flex-1">
                  <h3 className={item?.concluido ? "text-lg leading-tight line-through opacity-60" : "text-lg leading-tight"}>
                    <span className="mr-2 text-muted-foreground">{ex.ordem}.</span>
                    {ex.nome}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ex.tipo_repeticao === "periodizacao" ? "Segue a periodização" : ex.repeticoes_texto}
                  </p>
                  {ex.bi_set_grupo_id && <Badge className="mt-2">BI-SET</Badge>}
                </div>
              </div>

              {series.length > 0 && (
                <>
                  <Separator />
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {series.map((s) => (
                      <li key={s.numero}>
                        Série {s.numero}: {s.repeticoes ?? "–"} reps
                        {s.carga_kg != null && ` · ${s.carga_kg}kg`}
                        {s.carga_banda_kg != null && ` + banda ${s.carga_banda_kg}kg`}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <TimerDescanso
                nomeExercicio={ex.nome}
                padraoSegundos={ex.intervalo_segundos ?? DESCANSO_PADRAO}
              />

              <Button variant="ghost" size="sm" onClick={() => setSeriesDe(ex)}>
                <Plus className="size-4" /> Registrar séries (opcional)
              </Button>
            </Card>
          );
        })}
      </div>

      <SheetSeries
        exercicio={seriesDe}
        seriesIniciais={
          ((itens.find((i) => i.exercicio_id === seriesDe?.id)?.series ?? []) as unknown as SerieRegistrada[])
        }
        onClose={() => setSeriesDe(null)}
        onSalvar={(series) => {
          if (!seriesDe) return;
          salvarSeries.mutate({ exercicioId: seriesDe.id, series });
          setSeriesDe(null);
        }}
      />

      <Dialog open={dialogEncerrar} onOpenChange={setDialogEncerrar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como foi o treino?</DialogTitle>
            <DialogDescription>
              Selecione a intensidade percebida para encerrar o treino.
            </DialogDescription>
          </DialogHeader>
          <ToggleGroup
            type="single"
            value={intensidade}
            onValueChange={setIntensidade}
            className="grid grid-cols-5 gap-2"
          >
            {INTENSIDADES.map((i) => (
              <ToggleGroupItem
                key={i.valor}
                value={String(i.valor)}
                aria-label={i.rotulo}
                className="flex h-auto flex-col gap-1 py-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <span className="text-2xl">{i.emoji}</span>
                <span className="text-[10px] leading-tight">{i.rotulo}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogEncerrar(false)}>
              Voltar
            </Button>
            <Button disabled={!intensidade || encerrar.isPending} onClick={() => encerrar.mutate()}>
              Encerrar treino
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este treino?</AlertDialogTitle>
            <AlertDialogDescription>
              A sessão será descartada e não entrará no calendário nem nas estatísticas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar treinando</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelar.mutate()}>Cancelar treino</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function SheetSeries({
  exercicio,
  seriesIniciais,
  onClose,
  onSalvar,
}: {
  exercicio: Exercicio | null;
  seriesIniciais: SerieRegistrada[];
  onClose: () => void;
  onSalvar: (series: SerieRegistrada[]) => void;
}) {
  const [series, setSeries] = useState<SerieRegistrada[]>([]);

  useEffect(() => {
    if (exercicio) {
      setSeries(
        seriesIniciais.length
          ? seriesIniciais
          : [{ numero: 1, repeticoes: null, carga_kg: null, carga_banda_kg: null, observacao: null }],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercicio?.id]);

  const atualizar = (idx: number, campo: keyof SerieRegistrada, valor: string) => {
    setSeries((atual) =>
      atual.map((s, i) =>
        i === idx ? { ...s, [campo]: valor === "" ? null : Number(valor) } : s,
      ),
    );
  };

  return (
    <Sheet open={!!exercicio} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{exercicio?.nome}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-4">
          {series.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">Série {s.numero}</p>
                {series.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setSeries((a) => a.filter((_, i) => i !== idx).map((x, i) => ({ ...x, numero: i + 1 })))
                    }
                    aria-label="Remover série"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Reps</Label>
                  <Input
                    inputMode="numeric"
                    value={s.repeticoes ?? ""}
                    onChange={(e) => atualizar(idx, "repeticoes", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Carga (kg)</Label>
                  <Input
                    inputMode="decimal"
                    value={s.carga_kg ?? ""}
                    onChange={(e) => atualizar(idx, "carga_kg", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Banda (kg)</Label>
                  <Input
                    inputMode="decimal"
                    value={s.carga_banda_kg ?? ""}
                    onChange={(e) => atualizar(idx, "carga_banda_kg", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              setSeries((a) => [
                ...a,
                { numero: a.length + 1, repeticoes: null, carga_kg: null, carga_banda_kg: null, observacao: null },
              ])
            }
          >
            <Plus className="size-4" /> Adicionar série
          </Button>
          <Button className="w-full" onClick={() => onSalvar(series)}>
            Salvar séries
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
