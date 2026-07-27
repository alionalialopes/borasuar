import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { Exercicio } from "@/lib/dados";

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
