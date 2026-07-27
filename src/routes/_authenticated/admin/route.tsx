import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, LogOut, ShieldAlert } from "lucide-react";
import { useSecurityContext, useMfaFactors, useInactivityLogout, useSignOut } from "@/hooks/use-security";
import { ROLE_LABEL } from "@/lib/security-shared";
import { TotpEnrollment } from "@/components/TotpEnrollment";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: ctx, isLoading, refetch } = useSecurityContext();
  const { data: factors } = useMfaFactors();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const warning = useInactivityLogout(ctx?.inactivityMinutes, Boolean(ctx));

  const hasTotp = Boolean(factors?.totp?.some((f) => f.status === "verified"));
  const mustEnroll = Boolean(ctx && ctx.role === "superadmin" && ctx.require2faSuperadmin && !hasTotp);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Verificando sesión…
      </div>
    );
  }

  if (mustEnroll) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-md space-y-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <h1 className="text-base font-bold">Activa la verificación en dos pasos</h1>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tu cuenta es Superadministradora. Para proteger respaldos, entregas y datos
              sensibles debes configurar una app autenticadora antes de continuar.
            </p>
          </div>
          <TotpEnrollment
            onDone={() => {
              void refetch();
            }}
          />
          <button
            onClick={() => void signOut("logout")}
            className="w-full rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{ctx?.fullName ?? ctx?.email ?? "Cuenta"}</p>
            <p className="text-[10px] text-muted-foreground">
              {ctx ? ROLE_LABEL[ctx.role] : ""} · 2FA {hasTotp ? "activa" : "pendiente"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/admin/seguridad"
              className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground"
            >
              Seguridad
            </Link>
            <button
              onClick={() => void signOut("logout")}
              title="Cerrar sesión"
              className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {warning && (
          <div className="flex items-center justify-center gap-1 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <AlertTriangle className="h-3 w-3" /> Tu sesión se cerrará pronto por inactividad
          </div>
        )}
      </div>
      <Outlet />
      <div className="h-6" />
      <button
        onClick={() => navigate({ to: "/" })}
        className="mx-auto mb-8 block text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Volver al sitio público
      </button>
    </div>
  );
}
