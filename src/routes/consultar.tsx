import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/NavBar";
import { lookupOrder, type OrderLookupResult } from "@/lib/api-client";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/consultar")({
  head: () => ({
    meta: [
      { title: "Consultar pedido — MA²" },
      { name: "description", content: "Consulta el estado de tu trámite con tu folio MA²." },
      { property: "og:title", content: "Consultar pedido — MA²" },
      { property: "og:description", content: "Introduce tu folio para conocer el estado de tu solicitud." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Consultar,
});

function Consultar() {
  const [folio, setFolio] = useState("");
  const [result, setResult] = useState<OrderLookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await lookupOrder(folio);
    setResult(r);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader title="Consultar pedido" subtitle="Introduce tu folio" />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Folio</span>
              <input
                required
                value={folio}
                onChange={(e) => setFolio(e.target.value.toUpperCase())}
                placeholder="MA2-XXXXXX"
                className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-mono uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={20}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm active:scale-95 disabled:opacity-60"
            >
              {loading ? "Consultando…" : "Consultar"}
            </button>
          </form>

          <div className="mt-3 rounded-lg bg-secondary p-3 text-[11px] text-secondary-foreground">
            La <strong>consulta automática</strong> se habilitará cuando se conecte la API oficial. Por ahora
            puedes ver el registro local de tu solicitud y contactarnos por WhatsApp para conocer el estado.
          </div>
        </div>

        {result && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-card p-5 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Folio</div>
            <div className="font-mono text-lg font-bold">{result.folio || "—"}</div>
            {result.serviceName && (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Trámite:</span> <strong>{result.serviceName}</strong>
              </div>
            )}
            <div className="mt-1 text-sm">
              <span className="text-muted-foreground">Estado:</span>{" "}
              <strong className="text-primary">{result.status.replace("_", " ")}</strong>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{result.message}</p>
            <a
              href={buildWhatsAppUrl(`Hola, quiero saber el estado de mi folio ${result.folio}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-full rounded-full border border-primary/40 bg-background px-4 py-2 text-center text-sm font-semibold text-primary active:scale-95"
            >
              Preguntar por WhatsApp
            </a>
          </div>
        )}
      </main>
    </div>
  );
}