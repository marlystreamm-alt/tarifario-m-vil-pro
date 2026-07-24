import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/NavBar";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface StreamingService {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
}

const STREAMING_SERVICES: StreamingService[] = [
  {
    id: "netflix",
    name: "Netflix",
    price: "150",
    period: "1 mes",
    description: "Acceso completo a películas y series"
  },
  {
    id: "disneyplus",
    name: "Disney+",
    price: "120",
    period: "1 mes",
    description: "Marvel, Star Wars, Pixar y más"
  },
  {
    id: "hbomax",
    name: "HBO Max",
    price: "130",
    period: "1 mes",
    description: "Series premium y estrenos de cine"
  },
  {
    id: "primevideo",
    name: "Prime Video",
    price: "100",
    period: "1 mes",
    description: "Películas, series y contenido original"
  },
  {
    id: "paramount",
    name: "Paramount+",
    price: "110",
    period: "1 mes",
    description: "CBS, series de MTV y Pluto TV"
  },
  {
    id: "vix",
    name: "ViX Premium",
    price: "80",
    period: "1 mes",
    description: "Contenido latino y series exclusivas"
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    price: "95",
    period: "1 mes",
    description: "Anime, manga y contenido asiático"
  },
  {
    id: "canva",
    name: "Canva Pro",
    price: "120",
    period: "1 año",
    description: "Diseño gráfico profesional ilimitado"
  },
  {
    id: "plex",
    name: "Plex",
    price: "90",
    period: "1 mes",
    description: "Cine clásico y contenido de terror"
  }
];

export const Route = createFileRoute("/streaming")() ({
  head: () => ({
    meta: [
      { title: "Streaming — MA² Digital" },
      { name: "description", content: "Catálogo de suscripciones de streaming. Acceso a Netflix, Disney+, HBO Max y más." },
      { property: "og:title", content: "Streaming — MA² Digital" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Streaming,
});

function Streaming() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader title="Streaming" subtitle="Suscripciones de películas y series" showLoginIcon />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <div className="space-y-3">
          {STREAMING_SERVICES.map((service) => (
            <StreamingCard key={service.id} service={service} />
          ))}
        </div>
      </main>
    </div>
  );
}

function StreamingCard({ service }: { service: StreamingService }) {
  const waUrl = buildWhatsAppUrl(`Hola, quiero información sobre ${service.name}.`);
  
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <span className="text-lg font-bold text-primary">{service.name.charAt(0)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{service.name}</h3>
            <span className="shrink-0 text-sm font-bold text-primary">${service.price}</span>
          </div>
          <p className="text-xs text-muted-foreground">{service.period}</p>
          <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95"
          >
            Solicitar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}