import { useState } from "react";
import type { Service } from "@/lib/services-data";
import { getRequirements } from "@/lib/requirements";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { createOrder } from "@/lib/api-client";

export function RequestModal({
  service,
  publicPrice,
  onClose,
}: {
  service: Service;
  publicPrice: string;
  onClose: () => void;
}) {
  const reqs = getRequirements(service);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [folio, setFolio] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSending(true);
    const { folio: f } = await createOrder({
      clientName: name.trim(),
      phone: phone.trim(),
      serviceId: service.id,
      serviceName: service.name,
      details: details.trim(),
    });
    setFolio(f);
    setSending(false);

    const msg = [
      `Hola, quiero solicitar: ${service.name}`,
      publicPrice ? `Precio publicado: $${publicPrice}` : null,
      `Folio: ${f}`,
      `Nombre: ${name.trim()}`,
      `Teléfono: ${phone.trim()}`,
      details.trim() ? `Datos: ${details.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(buildWhatsAppUrl(msg), "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Solicitar trámite</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{service.name}</p>
          </div>
          {publicPrice && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              ${publicPrice}
            </span>
          )}
        </div>

        <div className="mt-3 rounded-lg bg-secondary p-3 text-[11px] text-secondary-foreground">
          <p className="font-semibold uppercase tracking-wide text-muted-foreground">Requisitos</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {reqs.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nombre</span>
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Nombre del cliente"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Teléfono</span>
            <input
              required
              inputMode="tel"
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, ""))}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="10 dígitos"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Datos / requisitos</span>
            <textarea
              maxLength={800}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="mt-0.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="CURP, RFC, fechas, correo, etc."
            />
          </label>
        </div>

        {folio && (
          <div className="mt-3 rounded-lg bg-accent px-3 py-2 text-[11px] text-accent-foreground">
            Folio generado: <span className="font-mono font-bold">{folio}</span>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            Cerrar
          </button>
          <button
            type="submit"
            disabled={sending}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm active:scale-95 disabled:opacity-60"
          >
            {sending ? "Enviando…" : "Enviar por WhatsApp"}
          </button>
        </div>
      </form>
    </div>
  );
}