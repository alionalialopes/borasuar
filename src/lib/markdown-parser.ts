// Parser do formato treinos.md (ver seção 6 do PRD).

export type TipoRepeticao = "periodizacao" | "fixo";

export interface ExercicioParseado {
  ordem: number;
  nome: string;
  imagem_url: string | null;
  video_url: string | null;
  imagem_ilustrativa: boolean;
  tipo_repeticao: TipoRepeticao;
  repeticoes_texto: string | null;
  carga_referencia_texto: string | null;
  intervalo_segundos: number | null;
  orientacoes: string | null;
  observacao: string | null;
  biSetRef: string | null;
  avisos: string[];
}

export interface TreinoParseado {
  letra: string;
  nome: string;
  mes_referencia: string;
  ordem: number;
  periodizacao: { semana: number; esquema: string }[];
  exercicios: ExercicioParseado[];
  avisos: string[];
}

const VAZIOS = ["", "-", "—", "–", "(não preenchida)", "*(não preenchida)*", "n/a"];

function limpar(valor: string | null | undefined): string | null {
  if (valor == null) return null;
  const t = valor.trim().replace(/\s+/g, " ");
  if (VAZIOS.includes(t.toLowerCase())) return null;
  return t.length ? t : null;
}

function semAcento(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseIntervalo(texto: string | null): number | null {
  const t = limpar(texto);
  if (!t) return null;
  const m = t.match(/(\d+)\s*(s|seg|segundos)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n)) return null;
  // "1 min" / "1'" → minutos
  if (/min|'/.test(t) && n <= 10) return n * 60;
  return n;
}

export function ehVideo(url: string) {
  return /\.(mp4|webm)(\?|$)/i.test(url) || /(youtube\.com|youtu\.be|vimeo\.com)/i.test(url);
}

function parsePeriodizacao(bloco: string) {
  const linhas = bloco.split("\n");
  const out: { semana: number; esquema: string }[] = [];
  for (const linha of linhas) {
    // tabela markdown: | 1 | 1x10 / 2x8 ... |
    const tabela = linha.match(/^\s*\|([^|]+)\|(.+)\|\s*$/);
    if (tabela) {
      const semana = Number((tabela[1] || "").replace(/\D/g, ""));
      const esquema = limpar(tabela[2].replace(/\|/g, " "));
      if (semana >= 1 && semana <= 8 && esquema && !/^-+$/.test(esquema)) {
        out.push({ semana, esquema });
      }
      continue;
    }
    // lista: - Semana 1: 1x10 / 2x8
    const lista = linha.match(/^\s*[-*]\s*\**semana\s*(\d+)\**\s*[:\-–]\s*(.+)$/i);
    if (lista) {
      const esquema = limpar(lista[2]);
      if (esquema) out.push({ semana: Number(lista[1]), esquema });
    }
  }
  return out;
}

function campo(bloco: string, nomes: string[]): string | null {
  for (const nome of nomes) {
    const re = new RegExp(
      `^\\s*[-*]\\s*\\*\\*${nome}:?\\*\\*:?\\s*(.*)$`,
      "im",
    );
    const m = bloco.match(re);
    if (m) return limpar(m[1]);
  }
  return null;
}

function parseExercicio(titulo: string, corpo: string, indice: number): ExercicioParseado {
  const avisos: string[] = [];
  const tituloMatch = titulo.match(/^\s*(\d+)\s*[.)-]\s*(.+)$/);
  const ordem = tituloMatch ? Number(tituloMatch[1]) : indice + 1;
  let nome = (tituloMatch ? tituloMatch[2] : titulo).trim();
  if (!tituloMatch) avisos.push("Não foi possível ler o número de ordem do exercício.");

  // bi-set no título
  let biSetRef: string | null = null;
  const biTitulo = nome.match(/\*?\(?\s*BI-?SET\s*(?:com)?\s*:?\s*([^)*]+)\)?\*?/i);
  if (biTitulo) {
    biSetRef = limpar(biTitulo[1]);
    nome = nome.replace(biTitulo[0], "").replace(/[\s*()-]+$/, "").trim();
  }
  const biCampo = campo(corpo, ["BI-SET", "BI SET", "BISET"]);
  if (biCampo) biSetRef = biSetRef ?? biCampo.replace(/^com\s+/i, "");

  // mídia
  const midia = corpo.match(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/);
  const url = midia ? midia[1] : null;
  let imagem_url: string | null = null;
  let video_url: string | null = null;
  if (url) {
    if (ehVideo(url)) video_url = url;
    else imagem_url = url;
  }

  // legenda em itálico logo após a mídia
  let imagem_ilustrativa = false;
  let legenda: string | null = null;
  if (midia) {
    const depois = corpo.slice((midia.index ?? 0) + midia[0].length);
    const it = depois.match(/^\s*\*\(?([^*]+?)\)?\*/);
    if (it) {
      legenda = limpar(it[1]);
      if (legenda && /ilustrativ|obtida em|obtido em|video demonstrativo|vídeo demonstrativo/i.test(legenda)) {
        imagem_ilustrativa = true;
      }
    }
  }

  const repeticoes_texto = campo(corpo, ["Repetições", "Repeticoes", "Repetiçoes"]);
  const tipo_repeticao: TipoRepeticao =
    repeticoes_texto && semAcento(repeticoes_texto).includes("segue a periodizacao")
      ? "periodizacao"
      : "fixo";

  const observacaoCampo = campo(corpo, ["Observação", "Observacao", "Obs"]);
  const observacao =
    [observacaoCampo, imagem_ilustrativa ? legenda : null].filter(Boolean).join(" — ") || null;

  if (!repeticoes_texto) avisos.push("Campo “Repetições” ausente ou não interpretado.");

  return {
    ordem,
    nome,
    imagem_url,
    video_url,
    imagem_ilustrativa,
    tipo_repeticao,
    repeticoes_texto,
    carga_referencia_texto: campo(corpo, ["Carga"]),
    intervalo_segundos: parseIntervalo(campo(corpo, ["Intervalo"])),
    orientacoes: campo(corpo, ["Orientações", "Orientacoes"]),
    observacao,
    biSetRef,
    avisos,
  };
}

export function parseTreinosMarkdown(markdown: string): TreinoParseado[] {
  const texto = markdown.replace(/\r\n/g, "\n");
  const partes = texto.split(/^#\s+(?=TREINO)/im).filter((p) => p.trim().length);
  const treinos: TreinoParseado[] = [];

  partes.forEach((parte, i) => {
    const linhas = parte.split("\n");
    const tituloLinha = linhas[0].replace(/^#\s*/, "").trim();
    if (!/^TREINO/i.test(tituloLinha)) return;
    const avisos: string[] = [];
    const m = tituloLinha.match(/^TREINO\s+([A-Za-z0-9]+)\s*[-–—]\s*(.+)$/i);
    const letra = (m ? m[1] : tituloLinha.replace(/TREINO/i, "").trim() || String(i + 1)).toUpperCase();
    const mes_referencia = m ? limpar(m[2]) ?? "" : "";
    if (!m) avisos.push("Título do treino fora do padrão “# TREINO X - MM/AAAA”.");

    const corpo = linhas.slice(1).join("\n");
    const secaoObs = corpo.match(/^##\s*Observaç(?:ões|oes)\s*$([\s\S]*?)(?=^##\s|\Z)/im);
    const periodizacao = secaoObs ? parsePeriodizacao(secaoObs[1]) : [];

    const secaoEx = corpo.match(/^##\s*Exerc[ií]cios\s*$([\s\S]*)/im);
    const blocoEx = secaoEx ? secaoEx[1] : corpo;
    const blocos = blocoEx.split(/^###\s+/m).slice(1);

    const exercicios = blocos.map((bloco, idx) => {
      const quebra = bloco.indexOf("\n");
      const titulo = quebra === -1 ? bloco : bloco.slice(0, quebra);
      const resto = quebra === -1 ? "" : bloco.slice(quebra + 1);
      return parseExercicio(titulo, resto, idx);
    });

    if (!exercicios.length) avisos.push("Nenhum exercício encontrado neste treino.");

    treinos.push({
      letra,
      nome: `TREINO ${letra}`,
      mes_referencia,
      ordem: i,
      periodizacao,
      exercicios,
      avisos,
    });
  });

  return treinos;
}

/** Atribui bi_set_grupo_id a pares de exercícios que se referenciam mutuamente. */
export function resolverBiSets(exercicios: ExercicioParseado[]): Record<number, string> {
  const grupos: Record<number, string> = {};
  const chave = (s: string) => semAcento(s).replace(/[^a-z0-9]/g, "");
  exercicios.forEach((ex) => {
    if (!ex.biSetRef || grupos[ex.ordem]) return;
    const alvo = exercicios.find(
      (o) =>
        o.ordem !== ex.ordem &&
        (chave(o.nome).includes(chave(ex.biSetRef!)) || chave(ex.biSetRef!).includes(chave(o.nome))),
    );
    if (alvo) {
      const id = crypto.randomUUID();
      grupos[ex.ordem] = id;
      grupos[alvo.ordem] = id;
    }
  });
  return grupos;
}
