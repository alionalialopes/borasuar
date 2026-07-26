export type Intensidade = 1 | 2 | 3 | 4 | 5;

export const INTENSIDADES: { valor: Intensidade; emoji: string; rotulo: string }[] = [
  { valor: 1, emoji: "😄", rotulo: "Muito fácil" },
  { valor: 2, emoji: "🙂", rotulo: "Fácil" },
  { valor: 3, emoji: "😐", rotulo: "Moderado" },
  { valor: 4, emoji: "😓", rotulo: "Difícil" },
  { valor: 5, emoji: "🥵", rotulo: "Muito difícil" },
];

export function intensidadeInfo(valor: number | null | undefined) {
  return INTENSIDADES.find((i) => i.valor === valor) ?? null;
}

export function formatarDuracao(segundos: number | null | undefined) {
  const s = Math.max(0, Math.floor(segundos ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
