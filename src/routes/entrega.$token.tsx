import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ExternalLink, FileText, Lock, MessageCircle, ShieldAlert } from "lucide-react";
import {
  effectiveStatus, getDeliveryByToken, markOpened, recentlyOpened, registerAccess,
  type Delivery,
} from "@/lib/deliveries";
import { buildWhatsAppUrl, WHATSAPP_NUMBER } from "@/lib/whatsapp";

export const Route = createFileRoute("/entrega/$token")({
  head: () => ({
    meta: [
      { title: "Entrega protegida — MA² Digital" },
      { name: "description", content: "Accede de forma segura al documento que MA² Digital preparó para ti." },
      { property: "og:title", content: "Entrega protegida — MA² Digital" },
      { property: "og:description", content: "Documento disponible mediante enlace protegido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EntregaPublica,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-4">
          <h1 className="text-lg font-bold tracking-tight">
            MA² <span className="text-primary">Digital</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">Entrega protegida de documentos</p>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
      <h2 className="mt-3 text-base font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <a
        href={buildWhatsAppUrl("Hola, necesito ayuda con mi entrega de documento.")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
      >
        <MessageCircle className="h-4 w-4" /> Contactar por WhatsApp
      </a>
    </div>
  );
}

function EntregaPublica() {
  const { token } = Route.useParams();
  const [ready, setReady] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const d = getDeliveryByToken(token);
    setDelivery(d);
    setReady(true);
    if (!d) return;
    const st = effectiveStatus(d);
    if (st !== "active") return;
    if (d.password && d.password.length > 0) return; // requiere contraseña
    // Sin contraseña: se desbloquea de inmediato.
    if (!recentlyOpened(token)) {
      const updated = registerAccess(d.id, true, "Apertura sin contraseña");
      if (updated) setDelivery(updated);
      markOpened(token);
    }
    setUnlocked(true);
  }, [token]);

  const status = useMemo(() => (delivery ? effectiveStatus(delivery) : null), [delivery]);

  if (!ready) {
    return <Shell><p className="text-sm text-muted-foreground">Cargando…</p></Shell>;
  }

  if (!delivery) {
    return <Shell><Notice title="Enlace no válido" text="Este enlace no existe o fue eliminado. Verifica con nosotros." /></Shell>;
  }

  if (status !== "active") {
    const texts: Record<string, string> = {
      blocked: "Esta entrega está bloqueada temporalmente. Contáctanos para reactivarla.",
      revoked: "Esta entrega fue revocada y ya no está disponible.",
      expired: "Este enlace expiró o alcanzó el máximo de aperturas permitidas.",
    };
    return <Shell><Notice title="Documento no disponible" text={texts[status ?? "expired"]} /></Shell>;
  }

  function tryUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!delivery) return;
    if (pwd.trim() !== (delivery.password ?? "")) {
      registerAccess(delivery.id, false, "Contraseña incorrecta", false);
      setError("Contraseña incorrecta.");
      return;
    }
    setError("");
    if (!recentlyOpened(token)) {
      const updated = registerAccess(delivery.id, true, "Apertura con contraseña");
      if (updated) setDelivery(updated);
      markOpened(token);
    }
    setUnlocked(true);
  }

  if (!unlocked) {
    return (
      <Shell>
        <form onSubmit={tryUnlock} className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-6">
          <Lock className="h-7 w-7 text-primary" />
          <h2 className="mt-3 text-base font-bold">Documento protegido</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Folio {delivery.folio}. Escribe la contraseña que te compartimos para ver el documento.
          </p>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Contraseña"
            autoComplete="off"
            className="mt-4 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
          <button type="submit" className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95">
            Desbloquear
          </button>
        </form>
      </Shell>
    );
  }

  const remaining =
    typeof delivery.maxOpens === "number" && delivery.maxOpens > 0
      ? Math.max(0, delivery.maxOpens - delivery.opens)
      : null;

  return (
    <Shell>
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Folio {delivery.folio}</p>
        <h2 className="mt-1 text-xl font-bold leading-tight">{delivery.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {delivery.clientName} · {delivery.procedure}
        </p>
        {delivery.description && <p className="mt-3 text-sm">{delivery.description}</p>}

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{delivery.fileName || "Documento"}</p>
            <p className="text-[11px] text-muted-foreground">
              {remaining !== null ? `Aperturas restantes: ${remaining}` : "Sin límite de aperturas"}
              {delivery.expiresAt ? ` · Vigente hasta ${new Date(delivery.expiresAt).toLocaleDateString("es-MX")}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <a
            href={delivery.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95"
          >
            <ExternalLink className="h-4 w-4" /> Ver documento
          </a>
          {delivery.allowDownload && (
            <a
              href={delivery.fileUrl}
              download={delivery.fileName || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground active:scale-95"
            >
              <Download className="h-4 w-4" /> Descargar
            </a>
          )}
          {WHATSAPP_NUMBER && (
            <a
              href={buildWhatsAppUrl(`Hola, tengo una duda sobre mi documento con folio ${delivery.folio}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold active:scale-95"
            >
              <MessageCircle className="h-4 w-4" /> Contactar por WhatsApp
            </a>
          )}
        </div>
      </section>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Enlace personal y protegido. No lo compartas con terceros.
      </p>
    </Shell>
  );
}
