import { useState } from "react";
import { Loader2, QrCode, Copy, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateRecoveryCodes, logSecurityEvent } from "@/lib/security.functions";
import { maskSecret } from "@/lib/security-shared";

/** Alta de segundo factor TOTP (QR + confirmación + códigos de recuperación). */
export function TotpEnrollment({ onDone }: { onDone?: () => void }) {
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const genCodes = useServerFn(generateRecoveryCodes);
  const log = useServerFn(logSecurityEvent);

  async function start() {
    setBusy(true);
    setError(null);
    // Limpia intentos previos sin verificar para evitar factores duplicados.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `MA2-${Date.now()}`,
    });
    setBusy(false);
    if (enrollError || !data) {
      setError("No fue posible iniciar la configuración. Intenta de nuevo.");
      return;
    }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.id,
      code: code.replace(/\D/g, ""),
    });
    if (verifyError) {
      setBusy(false);
      setError("Código incorrecto. Verifica la hora de tu teléfono e intenta otra vez.");
      await log({ data: { action: "mfa_challenge_failed", result: "failed" } }).catch(() => undefined);
      return;
    }
    await log({ data: { action: "mfa_enrolled" } }).catch(() => undefined);
    const res = await genCodes({ data: undefined as never });
    setBusy(false);
    setCodes(res.ok ? res.codes : []);
  }

  if (codes) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Códigos de recuperación</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Se muestran <strong>una sola vez</strong>. Guárdalos en un lugar seguro; cada código
          sirve una única vez si pierdes tu teléfono.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {codes.map((c) => (
            <li key={c} className="rounded-lg bg-secondary px-2 py-1.5 text-center font-mono text-xs">
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              void navigator.clipboard.writeText(codes.join("\n"));
              setCopied(true);
            }}
            className="flex-1 rounded-full border border-border px-3 py-2 text-xs font-semibold"
          >
            {copied ? <Check className="mx-auto h-4 w-4" /> : <Copy className="mx-auto h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              setCodes(null);
              setEnroll(null);
              setCode("");
              onDone?.();
            }}
            className="flex-[2] rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            Ya los guardé
          </button>
        </div>
      </div>
    );
  }

  if (!enroll) {
    return (
      <button
        onClick={() => void start()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
        Configurar app autenticadora
      </button>
    );
  }

  return (
    <form onSubmit={confirm} className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">Escanea el código QR</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Usa Google Authenticator, Microsoft Authenticator, Authy o cualquier app compatible.
      </p>
      <img src={enroll.qr} alt="Código QR para la app autenticadora" className="mx-auto my-3 h-44 w-44" />
      <div className="rounded-lg bg-secondary px-3 py-2 text-center">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clave manual</p>
        <p className="break-all font-mono text-xs">
          {showSecret ? enroll.secret : maskSecret(enroll.secret)}
        </p>
        <button
          type="button"
          onClick={() => setShowSecret((v) => !v)}
          className="mt-1 text-[10px] font-semibold text-primary"
        >
          {showSecret ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <input
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-primary"
      />
      {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirmar y activar"}
      </button>
    </form>
  );
}
