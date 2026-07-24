import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/NavBar";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/") ({
  head: () => ({
    meta: [
      { title: "MA² Digital — Streaming y trámites" },
      { name: "description", content: "Streaming, suscripciones y trámites digitales en un solo lugar. Solicita por WhatsApp." },
      { property: "og:title", content: "MA² Digital" },
      { property: "og:description", content: "Streaming y trámites digitales rápidos y seguros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#8b5cf6" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const waUrl = buildWhatsAppUrl("Hola, quiero información.");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader title="MA² Digital" subtitle="Streaming y trámites digitales" showLoginIcon />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold leading-tight">¿Qué necesitas hoy?</h2>
          <div className="grid gap-3">
            {/* Streaming Card */}
            <Link
              to="/streaming"
              className="group overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm transition-all active:scale-95 hover:border-primary/50"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Entretenimiento</p>
              <h3 className="mt-2 text-xl font-bold">Streaming</h3>
              <p className="mt-1 text-sm text-muted-foreground">Netflix, Disney+, HBO Max y más suscripciones.</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                Explorar → 
              </div>
            </Link>

            {/* Trámites Card */}
            <Link
              to="/tramites"
              className="group overflow-hidden rounded-3xl border border-secondary/50 bg-gradient-to-br from-secondary/10 via-card to-card p-6 shadow-sm transition-all active:scale-95 hover:border-secondary"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">Gestión</p>
              <h3 className="mt-2 text-xl font-bold">Trámites Digitales</h3>
              <p className="mt-1 text-sm text-muted-foreground">Actas, SAT, IMSS, INFONAVIT y certificados.</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary-foreground group-hover:translate-x-1 transition-transform">
                Ver catálogo → 
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">¿Necesitas ayuda?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Contáctanos por WhatsApp para consultas personalizadas.</p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-sm active:scale-95"
          >
            Contactar por WhatsApp
          </a>
        </section>
      </main>
    </div>
  );
}