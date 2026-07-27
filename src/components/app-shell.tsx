import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Dumbbell, CalendarDays, Upload, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const itens = [
  { to: "/", label: "Treinos", icon: Dumbbell },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/importar", label: "Importar", icon: Upload },
];

function MenuUsuario() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [perfil, setPerfil] = useState<{ nome: string; email: string; avatar?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setPerfil({
        nome: (u.user_metadata?.full_name as string) ?? u.email ?? "Você",
        email: u.email ?? "",
        avatar: u.user_metadata?.avatar_url as string | undefined,
      });
    });
  }, []);

  const sair = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const iniciais = (perfil?.nome ?? "?").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Conta">
          <Avatar className="size-8">
            {perfil?.avatar && <AvatarImage src={perfil.avatar} alt={perfil.nome} />}
            <AvatarFallback>{iniciais}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-56 truncate">
          {perfil?.nome}
          {perfil?.email && (
            <span className="block truncate text-xs font-normal text-muted-foreground">{perfil.email}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={sair}>
          <LogOut className="size-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border/60 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Dumbbell className="size-5" />
            </span>
            <span className="title-xl text-foreground">BoraSuar</span>
          </Link>
          <MenuUsuario />
        </div>
      </header>


      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {itens.map((item) => {
            const ativo = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  ativo ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
