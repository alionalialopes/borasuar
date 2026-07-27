import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no BoraSuar — Login com Google" },
      {
        name: "description",
        content: "Acesse sua conta com o Google para ver seus treinos, execuções e histórico de intensidade.",
      },
      { property: "og:title", content: "Entrar no BoraSuar" },
      { property: "og:description", content: "Login com Google para acessar seus treinos pessoais." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const entrar = async () => {
    setCarregando(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setCarregando(false);
      toast.error("Não foi possível entrar", { description: result.error.message });
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Dumbbell className="size-7" />
        </span>
        <h1 className="title-xl mt-4">BoraSuar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com sua conta Google para acessar seus treinos e seu histórico.
        </p>
        <Button className="mt-6 w-full" onClick={entrar} disabled={carregando}>
          <GoogleIcon className="size-4" />
          {carregando ? "Abrindo o Google…" : "Entrar com Google"}
        </Button>

      </Card>
    </div>
  );
}
