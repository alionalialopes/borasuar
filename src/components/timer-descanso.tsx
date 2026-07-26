import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Plus, Minus, SkipForward, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarDuracao } from "@/lib/intensidade";

function tocarAlerta(): boolean {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    if (ctx.state === "suspended") void ctx.resume();
    const agora = ctx.currentTime;
    [0, 0.28, 0.56].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, agora + offset);
      gain.gain.setValueAtTime(0.0001, agora + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, agora + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, agora + offset + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(agora + offset);
      osc.stop(agora + offset + 0.25);
    });
    setTimeout(() => void ctx.close(), 1500);
    return true;
  } catch {
    return false;
  }
}

export function pedirPermissaoNotificacao() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") void Notification.requestPermission();
}

/** Cronômetro regressivo de descanso, independente por exercício. */
export function TimerDescanso({
  nomeExercicio,
  padraoSegundos,
}: {
  nomeExercicio: string;
  padraoSegundos: number;
}) {
  const [duracao, setDuracao] = useState(padraoSegundos);
  const [fimEm, setFimEm] = useState<number | null>(null);
  const [restante, setRestante] = useState(padraoSegundos);
  const [concluido, setConcluido] = useState(false);
  const disparado = useRef(false);

  const alertar = useCallback(() => {
    const som = tocarAlerta();
    let notificou = false;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Descanso concluído", { body: nomeExercicio, tag: nomeExercicio });
        notificou = true;
      } catch {
        notificou = false;
      }
    }
    toast(`⏰ Descanso concluído — ${nomeExercicio}`, {
      description:
        som || notificou
          ? "Bora para a próxima série!"
          : "Som/notificação bloqueados pelo navegador — toque na tela para liberar o aviso sonoro.",
      duration: 8000,
    });
    if (!som && !notificou) pedirPermissaoNotificacao();
  }, [nomeExercicio]);

  useEffect(() => {
    if (fimEm == null) return;
    const tick = () => {
      // baseado em timestamp, não em contagem de frames (resiste a background)
      const s = Math.max(0, Math.ceil((fimEm - Date.now()) / 1000));
      setRestante(s);
      if (s === 0 && !disparado.current) {
        disparado.current = true;
        setConcluido(true);
        setFimEm(null);
        alertar();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fimEm, alertar]);

  const iniciar = (segundos = duracao) => {
    disparado.current = false;
    setConcluido(false);
    setDuracao(segundos);
    setRestante(segundos);
    setFimEm(Date.now() + segundos * 1000);
    pedirPermissaoNotificacao();
  };

  const ajustar = (delta: number) => {
    const novo = Math.max(5, (fimEm ? restante : duracao) + delta);
    setDuracao(novo);
    setRestante(novo);
    if (fimEm) setFimEm(Date.now() + novo * 1000);
  };

  const pular = () => {
    setFimEm(null);
    setConcluido(false);
    disparado.current = false;
    setRestante(duracao);
  };

  const rodando = fimEm != null;
  const pct = duracao > 0 ? ((duracao - restante) / duracao) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-background/40 p-3",
        concluido && "animate-pulse-alert border-accent bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {concluido ? (
            <BellRing className="size-4 text-accent" />
          ) : (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Descanso</span>
          )}
          <span className={cn("mono-timer text-2xl", concluido && "text-accent")}>
            {formatarDuracao(restante)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="secondary" onClick={() => ajustar(-15)} aria-label="Menos 15 segundos">
            <Minus className="size-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={() => ajustar(15)} aria-label="Mais 15 segundos">
            <Plus className="size-4" />
          </Button>
          {rodando ? (
            <Button size="sm" variant="ghost" onClick={pular}>
              <SkipForward className="size-4" /> Pular
            </Button>
          ) : (
            <Button size="sm" onClick={() => iniciar()}>
              <Play className="size-4" /> {concluido ? "De novo" : "Iniciar descanso"}
            </Button>
          )}
        </div>
      </div>
      {(rodando || concluido) && <Progress value={concluido ? 100 : pct} className="mt-2 h-1.5" />}
    </div>
  );
}
