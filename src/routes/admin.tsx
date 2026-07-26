import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/admin") ({
  head: () => ({
    meta: [
      { title: "Acceso — MA² Digital" },
      { name: "description", content: "Panel de acceso para administradores y revendedores." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [role, setRole] = useState<"admin" | "reseller" | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Acceso demo: siempre navega, aunque los campos estén vacíos.
  const handleContinue = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate({ to: "/admin/dashboard" });
  };

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">MA² Digital</h1>
            <p className="mt-1 text-sm text-muted-foreground">Panel de acceso</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setRole("admin")}
              className="w-full rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-card p-5 text-left transition-all hover:border-primary hover:bg-card active:scale-95"
            >
              <h2 className="font-semibold text-foreground">Administrador</h2>
              <p className="mt-1 text-xs text-muted-foreground">Acceso completo a reportes, clientes y configuración</p>
            </button>

            <button
              onClick={() => setRole("reseller")}
              className="w-full rounded-2xl border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 to-card p-5 text-left transition-all hover:border-secondary hover:bg-card active:scale-95"
            >
              <h2 className="font-semibold text-foreground">Revendedor</h2>
              <p className="mt-1 text-xs text-muted-foreground">Gestión de pedidos, clientes y mis ganancias</p>
            </button>
          </div>

          <Link
            to="/"
            className="block text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Acceso de {role === "admin" ? "Administrador" : "Revendedor"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Interfaz visual - Autenticación será conectada posteriormente a Supabase
          </p>
        </div>

        <form onSubmit={handleContinue} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Usuario
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Acceso demo: puedes continuar sin llenar los campos.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm active:scale-95"
          >
            Continuar (Demo)
          </button>
        </form>

        <button
          onClick={() => setRole(null)}
          className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Cambiar rol
        </button>
      </div>
    </div>
  );
}