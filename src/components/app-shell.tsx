import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, CalendarDays, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const itens = [
  { to: "/", label: "Treinos", icon: Dumbbell },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/importar", label: "Importar", icon: Upload },
];

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
