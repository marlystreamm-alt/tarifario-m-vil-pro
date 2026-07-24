import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/NavBar";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { SERVICES } from "@/lib/services-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MA² Trámites — Tu gestor de confianza" },
      { name: "description", content: "Gestionamos tus trámites en minutos: actas, SAT, IMSS, INFONAVIT y más. Solicita por WhatsApp." },
      { property: "og:title", content: "MA² Trámites" },
      { property: "og:description", content: "Trámites rápidos y seguros. Solicita por WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#8b5cf6" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const waUrl = buildWhatsAppUrl("Hola, quiero información sobre un trámite.");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader title="MA² Trámites" subtitle="Tu gestor de confianza" />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Bienvenido</p>
          <h2 className="mt-1 text-2xl font-bold leading-tight">Trámites rápidos, precios claros.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Actas, SAT, IMSS, INFONAVIT y más. Cotiza en segundos y solicita directo por WhatsApp.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/tramites" className="w-full rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-sm active:scale-95">
              Ver trámites
            </Link>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-full rounded-full border border-primary/40 bg-background px-4 py-2.5 text-center text-sm font-semibold text-primary active:scale-95">
              Solicitar por WhatsApp
            </a>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-3 gap-2">
          <Stat value={`${SERVICES.length}+`} label="Trámites" />
          <Stat value="1–2h" label="Entrega típica" />
          <Stat value="24/7" label="Solicitudes" />
        </section>

        <section className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold">¿Cómo funciona?</h3>
          <Step n={1} t="Elige tu trámite" d="Explora el catálogo por categoría o busca por nombre." />
          <Step n={2} t="Solicita" d="Llena un formulario simple y envíalo por WhatsApp." />
          <Step n={3} t="Recibe tu folio" d="Consulta el estado en la sección Consultar pedido." />
        </section>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
      <div className="text-lg font-bold text-primary">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function Step({ n, t, d }: { n: number; t: string; d: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
      <div>
        <div className="text-sm font-semibold">{t}</div>
        <div className="text-xs text-muted-foreground">{d}</div>
      </div>
    </div>
  );
}