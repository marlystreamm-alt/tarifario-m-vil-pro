import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldAlert, KeyRound, History, Users, Clock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMfaFactors, useSecurityContext, useSignOut } from "@/hooks/use-security";
import { useStepUp } from "@/components/StepUpDialog";
import { TotpEnrollment } from "@/components/TotpEnrollment";
import {
  generateRecoveryCodes,
  listAccounts,
  listSecurityEvents,
  setAccountRole,
  updateSecuritySettings,
  logSecurityEvent,
} from "@/lib/security.functions";
import { ROLE_LABEL, eventLabel, maskEmail, type AppRole } from "@/lib/security-shared";

export const Route = createFileRoute("/_authenticated/admin/seguridad")({
  head: () => ({
    meta: [
      { title: "Seguridad de la cuenta — MA² Digital" },
      { name: "description", content: "Verificación en dos pasos, sesiones y bitácora de seguridad." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const qc = useQueryClient();
  const { data: ctx, refetch: refetchCtx } = useSecurityContext();
  const { data: factors, refetch: refetchFactors } = useMfaFactors();
  const { request, dialog } = useStepUp();
  const signOut = useSignOut();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);

  const eventsFn = useServerFn(listSecurityEvents);
  const accountsFn = useServerFn(listAccounts);
  const genCodes = useServerFn(generateRecoveryCodes);
  const saveSettings = useServerFn(updateSecuritySettings);
  const changeRole = useServerFn(setAccountRole);
  const log = useServerFn(logSecurityEvent);

  const events = useQuery({ queryKey: ["security-events"], queryFn: () => eventsFn(), retry: false });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => accountsFn(), retry: false });

  const verified = factors?.totp?.find((f) => f.status === "verified");
  const isSuper = ctx?.role === "superadmin";

  async function onRegenerateCodes() {
    if (!(await request("recovery_codes_regenerate"))) {
      toast.error("No autorizado. Verifica tu segundo factor.");
      return;
    }
    const res = await genCodes({ data: undefined as never });
    if (!res.ok) {
      toast.error("Necesitas verificación en dos pasos activa.");
      return;
    }
    setCodes(res.codes);
    void refetchCtx();
  }

  async function onDisable2fa() {
    if (!verified) return;
    if (!(await request("disable_2fa"))) {
      toast.error("No autorizado para desactivar la verificación en dos pasos.");
      return;
    }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
    if (error) {
      toast.error("No fue posible desactivarla.");
      return;
    }
    await log({ data: { action: "mfa_disabled" } }).catch(() => undefined);
    toast.success("Verificación en dos pasos desactivada.");
    void refetchFactors();
    void refetchCtx();
  }

  async function onSaveMinutes() {
    const value = minutes ?? ctx?.inactivityMinutes ?? 15;
    if (!(await request("security_settings_change", { inactivity_minutes: value }))) {
      toast.error("Solo el Superadministrador con 2FA reciente puede cambiar esto.");
      return;
    }
    const res = await saveSettings({ data: { inactivityMinutes: value } });
    if (!res.ok) {
      toast.error("No autorizado.");
      return;
    }
    toast.success("Configuración de seguridad actualizada.");
    void refetchCtx();
    void qc.invalidateQueries({ queryKey: ["security-events"] });
  }

  async function onChangeRole(userId: string, role: AppRole) {
    if (!(await request("permissions_change", { target: userId, role }))) {
      toast.error("No autorizado para cambiar permisos.");
      return;
    }
    const res = await changeRole({ data: { userId, role } });
    if (!res.ok) {
      toast.error("No autorizado.");
      return;
    }
    toast.success("Rol actualizado.");
    void accounts.refetch();
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
      {dialog}
      <header>
        <h1 className="text-xl font-bold">Seguridad de la cuenta</h1>
        <p className="text-xs text-muted-foreground">
          {ctx ? `${ROLE_LABEL[ctx.role]} · ${maskEmail(ctx.email)}` : ""}
        </p>
      </header>

      <Card
        icon={verified ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
        title="Verificación en dos pasos (app autenticadora)"
        subtitle={verified ? "Activa y protegiendo tu cuenta" : "No activada"}
      >
        {verified ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Última verificación:{" "}
              {ctx?.mfaVerifiedAt ? new Date(ctx.mfaVerifiedAt * 1000).toLocaleString("es-MX") : "—"}
              {" · "}
              Códigos de recuperación disponibles: <strong>{ctx?.recoveryCodesLeft ?? 0}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void onRegenerateCodes()}
                className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <KeyRound className="mr-1 inline h-3 w-3" /> Regenerar códigos
              </button>
              <button
                onClick={() => void onDisable2fa()}
                className="rounded-full border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive"
              >
                Desactivar 2FA
              </button>
            </div>
          </div>
        ) : (
          <TotpEnrollment
            onDone={() => {
              void refetchFactors();
              void refetchCtx();
            }}
          />
        )}
        {codes && (
          <div className="mt-3 rounded-xl border border-border bg-secondary/50 p-3">
            <p className="text-xs font-semibold">Nuevos códigos (se muestran una sola vez)</p>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {codes.map((c) => (
                <li key={c} className="rounded bg-background px-2 py-1 text-center font-mono text-xs">
                  {c}
                </li>
              ))}
            </ul>
            <button onClick={() => setCodes(null)} className="mt-2 text-[11px] font-semibold text-primary">
              Ya los guardé
            </button>
          </div>
        )}
      </Card>

      <Card icon={<Clock className="h-5 w-5 text-primary" />} title="Sesión e inactividad">
        <p className="text-xs text-muted-foreground">
          Último acceso: {ctx?.lastSignInAt ? new Date(ctx.lastSignInAt).toLocaleString("es-MX") : "—"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={480}
            disabled={!isSuper}
            value={minutes ?? ctx?.inactivityMinutes ?? 15}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
          />
          <span className="text-xs text-muted-foreground">minutos de inactividad</span>
          {isSuper && (
            <button
              onClick={() => void onSaveMinutes()}
              className="ml-auto rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Guardar
            </button>
          )}
        </div>
        <button
          onClick={() => void signOut("logout_all")}
          className="mt-3 w-full rounded-full border border-border px-3 py-2 text-xs font-semibold"
        >
          <LogOut className="mr-1 inline h-3 w-3" /> Cerrar todas mis sesiones activas
        </button>
      </Card>

      {ctx && ctx.role !== "employee" && (
        <Card icon={<Users className="h-5 w-5 text-primary" />} title="Cuentas y roles">
          <ul className="divide-y divide-border">
            {(accounts.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{a.full_name ?? maskEmail(a.email)}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{maskEmail(a.email)}</p>
                </div>
                <select
                  value={a.role}
                  disabled={!isSuper}
                  onChange={(e) => void onChangeRole(a.id, e.target.value as AppRole)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] disabled:opacity-60"
                >
                  <option value="superadmin">{ROLE_LABEL.superadmin}</option>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                  <option value="employee">{ROLE_LABEL.employee}</option>
                </select>
              </li>
            ))}
            {!accounts.data?.length && <li className="py-2 text-xs text-muted-foreground">Sin cuentas registradas.</li>}
          </ul>
        </Card>
      )}

      <Card icon={<History className="h-5 w-5 text-primary" />} title="Bitácora de seguridad">
        <ul className="divide-y divide-border">
          {(events.data ?? []).map((e) => (
            <li key={e.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold">{eventLabel(e.action)}</p>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                    (e.result === "success"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive")
                  }
                >
                  {e.result === "success" ? "OK" : e.result === "denied" ? "Denegado" : "Fallo"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {new Date(e.created_at).toLocaleString("es-MX")} · {maskEmail(e.actor_email)} ·{" "}
                {e.ip ?? "IP no disponible"}
              </p>
            </li>
          ))}
          {!events.data?.length && (
            <li className="py-2 text-xs text-muted-foreground">Sin eventos registrados todavía.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start gap-2">
        {icon}
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
