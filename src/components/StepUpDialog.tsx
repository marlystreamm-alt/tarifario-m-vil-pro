import { useCallback, useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { authorizeCriticalAction } from "@/lib/security.functions";
import { CRITICAL_ACTION_LABEL, type CriticalAction } from "@/lib/security-shared";

type Pending = {
  action: CriticalAction;
  metadata?: Record<string, unknown>;
  resolve: (ok: boolean) => void;
};

/**
 * Verificación de segundo factor reciente antes de acciones críticas.
 * La autorización final la valida el servidor (rol + antigüedad del 2FA).
 */
export function useStepUp() {
  const [pending, setPending] = useState<Pending | null>(null);
  const authorize = useServerFn(authorizeCriticalAction);

  const request = useCallback(
    (action: CriticalAction, metadata?: Record<string, unknown>) =>
      new Promise<boolean>((resolve) => {
        void (async () => {
          // Si el segundo factor sigue vigente, el servidor autoriza sin pedir código.
          try {
            const res = await authorize({ data: { action, metadata } });
            if (res.ok) return resolve(true);
            if (res.reason === "rol_insuficiente") return resolve(false);
          } catch {
            /* pedir código */
          }
          setPending({ action, metadata, resolve });
        })();
      }),
    [authorize],
  );

  const dialog = pending ? (
    <StepUpDialog
      action={pending.action}
      metadata={pending.metadata}
      onClose={(ok) => {
        pending.resolve(ok);
        setPending(null);
      }}
    />
  ) : null;

  return { request, dialog };
}

function StepUpDialog({
  action,
  metadata,
  onClose,
}: {
  action: CriticalAction;
  metadata?: Record<string, unknown>;
  onClose: (ok: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const authorize = useServerFn(authorizeCriticalAction);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp?.find((f) => f.status === "verified");
      if (!factor) {
        setError("Necesitas activar la verificación en dos pasos para continuar.");
        return;
      }
      const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.replace(/\D/g, ""),
      });
      if (mfaError) {
        setError("Código incorrecto o vencido. Inténtalo de nuevo.");
        return;
      }
      const res = await authorize({ data: { action, metadata } });
      if (!res.ok) {
        setError(
          res.reason === "rol_insuficiente"
            ? "Tu rol no tiene autorización para esta acción."
            : "No fue posible autorizar la acción. Intenta otra vez.",
        );
        return;
      }
      onClose(true);
    } catch {
      setError("No fue posible verificar el código. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">Confirmación de seguridad</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Acción crítica: <span className="font-medium">{CRITICAL_ACTION_LABEL[action]}</span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Escribe el código de 6 dígitos de tu app autenticadora.
        </p>
        <input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-primary"
        />
        {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
