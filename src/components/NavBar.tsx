import { Link } from "@tanstack/react-router";

type NavLink = { to: "/" | "/tramites" | "/consultar" | "/admin"; label: string; exact?: boolean };
const LINKS: NavLink[] = [
  { to: "/", label: "Inicio", exact: true },
  { to: "/tramites", label: "Trámites" },
  { to: "/consultar", label: "Consultar pedido" },
  { to: "/admin", label: "Administrar" },
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

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-xl px-4 pt-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">
            MA² <span className="text-primary">Trámites</span>
          </h1>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          {title && title !== "MA² Trámites" && (
            <p className="mt-0.5 text-xs font-semibold text-foreground">{title}</p>
          )}
        </div>
        <NavBar />
      </div>
    </header>
  );
}