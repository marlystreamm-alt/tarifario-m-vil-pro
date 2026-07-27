import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { logLoginFailure, registerSignIn } from "@/lib/security.functions";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ timeout: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Acceso seguro — MA² Digital" },
      { name: "description", content: "Inicio de sesión con correo, contraseña y verificación en dos pasos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acceso seguro — MA² Digital" },
      { property: "og:description", content: "Área privada de MA² Digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Step = "credentials" | "mfa";

function AuthPage() {
  const navigate = useNavigate();
  const { timeout } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const registerSignInFn = useServerFn(registerSignIn);
  const logFailure = useServerFn(logLoginFailure);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin/dashboard", replace: true });
    });
  }, [navigate]);

  async function finish() {
    try {
      await registerSignInFn({ data: undefined as never });
    } catch {
      /* la bitácora no debe bloquear el acceso */
    }
    navigate({ to: "/admin/dashboard", replace: true });
  }

  async function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: fullName.trim() },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setInfo("Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.");
        setMode("signin");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        await logFailure({ data: { email: email.trim() } }).catch(() => undefined);
        setError("Correo o contraseña incorrectos.");
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
        setStep("mfa");
        return;
      }
      await finish();
    } catch {
      setError("No fue posible completar el acceso. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\D/g, ""),
    });
    setBusy(false);
    if (mfaError) {
      setError("Código incorrecto o vencido.");
      return;
    }
    await finish();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
              {step === "mfa" ? (
                <ShieldCheck className="h-8 w-8 text-primary" />
              ) : (
                <Lock className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold">MA² Digital</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "mfa" ? "Verificación en dos pasos" : "Acceso seguro al área privada"}
          </p>
        </div>

        {timeout && step === "credentials" && (
          <p className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
            Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.
          </p>
        )}

        {step === "credentials" ? (
          <form onSubmit={onSubmitCredentials} className="space-y-3">
            {mode === "signup" && (
              <Field label="Nombre completo">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="input-ma2"
                  placeholder="Nombre y apellido"
                />
              </Field>
            )}
            <Field label="Correo">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="input-ma2"
                placeholder="correo@ejemplo.com"
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="input-ma2"
                placeholder="••••••••"
              />
            </Field>

            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            {info && <p className="text-xs font-medium text-primary">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm active:scale-95 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                "Iniciar sesión"
              ) : (
                "Crear cuenta"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="w-full rounded-full border border-border px-4 py-2 text-sm font-medium"
            >
              {mode === "signin" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitMfa} className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Escribe el código de 6 dígitos de tu app autenticadora.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-primary"
            />
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verificar"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              ¿Perdiste tu teléfono? Usa un código de recuperación desde “Seguridad de la cuenta”
              con ayuda del Superadministrador.
            </p>
          </form>
        )}

        <Link to="/" className="block text-center text-xs font-medium text-muted-foreground hover:text-foreground">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
