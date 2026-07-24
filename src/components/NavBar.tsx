import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";

type NavLink = { to: "/" | "/streaming" | "/tramites" | "/consultar"; label: string; exact?: boolean };
const LINKS: NavLink[] = [
  { to: "/", label: "Inicio", exact: true },
  { to: "/streaming", label: "Streaming" },
  { to: "/tramites", label: "Trámites" },
  { to: "/consultar", label: "Consultar pedido" },
];

export function NavBar() {
  return (
    <nav className="mx-auto mt-2 flex max-w-xl gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {LINKS.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          activeOptions={{ exact: l.exact ?? false }}
          className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppHeader({ title, subtitle, showLoginIcon = false }: { title: string; subtitle?: string; showLoginIcon?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-xl px-4 pt-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight">
              MA² <span className="text-primary">Digital</span>
            </h1>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
            {title && title !== "MA² Digital" && (
              <p className="mt-0.5 text-xs font-semibold text-foreground">{title}</p>
            )}
          </div>
          {showLoginIcon && (
            <Link
              to="/admin"
              className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Iniciar sesión"
            >
              <LogIn className="h-4 w-4" />
            </Link>
          )}
        </div>
        <NavBar />
      </div>
    </header>
  );
}