import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Users, RefreshCw, Plus, UserCheck, Users2, TrendingUp, Megaphone, ShieldCheck, FileLock2, DatabaseBackup } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard") ({
  head: () => ({
    meta: [
      { title: "Dashboard — MA² Digital" },
      { name: "description", content: "Panel de administrador." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

interface DashboardCard {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  trend?: string;
  color: "primary" | "accent" | "secondary";
}

function AdminDashboard() {
  const cards: DashboardCard[] = [
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: "Ventas del día",
      value: "$2,450",
      trend: "+12% vs ayer",
      color: "primary",
    },
    {
      icon: <Package className="h-5 w-5" />,
      label: "Pedidos pendientes",
      value: "8",
      subtext: "3 urgentes",
      color: "accent",
    },
    {
      icon: <Users2 className="h-5 w-5" />,
      label: "Cuentas disponibles",
      value: "45",
      subtext: "22 Netflix, 15 HBO Max",
      color: "secondary",
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      label: "Renovaciones próximas",
      value: "12",
      subtext: "en próximos 7 días",
      color: "primary",
    },
  ];

  const quickActions = [
    { icon: <Plus className="h-5 w-5" />, label: "Nueva venta", to: "/admin/pedidos" },
    { icon: <UserCheck className="h-5 w-5" />, label: "Asignar cuenta", to: "/admin/cuentas" },
    { icon: <Users className="h-5 w-5" />, label: "Clientes", to: "/admin/clientes" },
    { icon: <TrendingUp className="h-5 w-5" />, label: "Reportes", to: "/admin/reportes" },
    { icon: <ShieldCheck className="h-5 w-5" />, label: "Seguridad", to: "/admin/seguridad" },
    { icon: <DatabaseBackup className="h-5 w-5" />, label: "Respaldos", to: "/admin/respaldos" },
    { icon: <Megaphone className="h-5 w-5" />, label: "Anuncios", to: "/admin/anuncios" },
    { icon: <ShieldCheck className="h-5 w-5" />, label: "Usuarios", to: "/admin/usuarios" },
    { icon: <FileLock2 className="h-5 w-5" />, label: "Entrega protegida", to: "/admin/entregas" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-xl px-4 py-4">
          <h1 className="text-lg font-bold">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">Datos de demostración - Conectando a Supabase</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-24 pt-4">
        <div className="space-y-3">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`overflow-hidden rounded-2xl border p-4 shadow-sm ${
                card.color === "primary"
                  ? "border-primary/30 bg-gradient-to-br from-primary/5 to-card"
                  : card.color === "accent"
                  ? "border-accent/30 bg-gradient-to-br from-accent/5 to-card"
                  : "border-secondary/30 bg-gradient-to-br from-secondary/5 to-card"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
                  {card.trend && (
                    <p className="mt-1 text-[10px] font-medium text-primary">{card.trend}</p>
                  )}
                  {card.subtext && (
                    <p className="mt-1 text-[10px] text-muted-foreground">{card.subtext}</p>
                  )}
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    card.color === "primary"
                      ? "bg-primary/10 text-primary"
                      : card.color === "accent"
                      ? "bg-accent/10 text-accent"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Acciones rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                to={action.to as any}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all active:scale-95 hover:border-primary"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {action.icon}
                </div>
                <span className="text-center text-xs font-medium text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Este es un dashboard de demostración. Los datos mostrados son de ejemplo. La integración con Supabase para datos reales será implementada próximamente.
          </p>
        </div>
      </main>
    </div>
  );
}