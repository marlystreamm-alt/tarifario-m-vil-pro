import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Eye, History, Lock, Pencil, Plus, Search, Share2, ShieldOff, Trash2, Unlock, X,
} from "lucide-react";
import {
  createDelivery, deleteDelivery, deliveryPublicUrl, effectiveStatus, emptyDeliveryInput,
  listDeliveries, setDeliveryStatus, subscribeDeliveries, updateDelivery, validateDelivery,
  STATUS_LABEL, type Delivery, type DeliveryInput, type DeliveryStatus,
} from "@/lib/deliveries";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/entregas")({
  head: () => ({
    meta: [
      { title: "Entrega Protegida — MA² Digital" },
      { name: "description", content: "Administración de entregas protegidas de documentos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminEntregas,
});

const FILTERS: { key: DeliveryStatus | "all"; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "active", label: "Activas" },
  { key: "expired", label: "Expiradas" },
  { key: "blocked", label: "Bloqueadas" },
  { key: "revoked", label: "Revocadas" },
];

function statusClass(s: DeliveryStatus) {
  if (s === "active") return "bg-primary/10 text-primary border-primary/30";
  if (s === "expired") return "bg-muted text-muted-foreground border-border";
  if (s === "blocked") return "bg-accent/10 text-accent border-accent/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminEntregas() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DeliveryStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [draft, setDraft] = useState<DeliveryInput>(emptyDeliveryInput());
  const [created, setCreated] = useState<Delivery | null>(null);
  const [logFor, setLogFor] = useState<Delivery | null>(null);

  const refresh = () => setItems(listDeliveries());

  useEffect(() => {
    refresh();
    return subscribeDeliveries(refresh);
  }, []);

  const stats = useMemo(() => {
    const s = { total: items.length, active: 0, expired: 0, blocked: 0 };
    for (const d of items) {
      const e = effectiveStatus(d);
      if (e === "active") s.active++;
      else if (e === "expired") s.expired++;
      else if (e === "blocked") s.blocked++;
    }
    return s;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      const e = effectiveStatus(d);
      if (filter !== "all" && e !== filter) return false;
      if (!q) return true;
      return [d.folio, d.clientName, d.phone ?? "", d.procedure, d.title]
        .join(" ").toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  function openNew() {
    setEditing(null);
    setDraft(emptyDeliveryInput());
    setCreated(null);
    setFormOpen(true);
  }

  function openEdit(d: Delivery) {
    setEditing(d);
    setDraft({
      clientName: d.clientName, phone: d.phone ?? "", email: d.email ?? "", procedure: d.procedure,
      title: d.title, description: d.description ?? "", fileName: d.fileName ?? "", fileUrl: d.fileUrl,
      password: d.password ?? "", expiresAt: d.expiresAt ?? null, maxOpens: d.maxOpens ?? null,
      allowDownload: d.allowDownload, notes: d.notes ?? "",
    });
    setCreated(null);
    setFormOpen(true);
  }

  function save() {
    const err = validateDelivery(draft);
    if (err) {
      toast.error(err);
      return;
    }
    if (editing) {
      updateDelivery(editing.id, draft);
      toast.success("Entrega actualizada.");
      setFormOpen(false);
    } else {
      const item = createDelivery(draft);
      toast.success(`Entrega ${item.folio} creada.`);
      setCreated(item);
      setEditing(item);
    }
    refresh();
  }

  async function copyLink(d: Delivery) {
    const url = deliveryPublicUrl(d.token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado.");
    } catch {
      toast.message(url);
    }
  }

  function shareWa(d: Delivery) {
    const msg = `Hola ${d.clientName}, tu documento "${d.title}" (folio ${d.folio}) está listo. Ábrelo aquí: ${deliveryPublicUrl(d.token)}`;
    const number = (d.phone ?? "").replace(/[^0-9]/g, "");
    window.open(number ? buildWhatsAppUrl(msg, number) : buildWhatsAppUrl(msg), "_blank", "noopener");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
          <Link to="/admin/dashboard" className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">Entrega Protegida</h1>
            <p className="text-[11px] text-muted-foreground">Enlaces con token, contraseña y límites</p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-24 pt-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: stats.total },
            { label: "Activas", value: stats.active },
            { label: "Expiradas", value: stats.expired },
            { label: "Bloqueadas", value: stats.blocked },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-2 text-center shadow-sm">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar folio, cliente, teléfono o trámite"
            className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No hay entregas que coincidan.
            </p>
          )}
          {filtered.map((d) => {
            const st = effectiveStatus(d);
            return (
              <article key={d.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{d.folio}</p>
                    <h2 className="truncate text-sm font-bold">{d.title}</h2>
                    <p className="truncate text-xs text-muted-foreground">{d.clientName} · {d.procedure}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(st)}`}>
                    {STATUS_LABEL[st]}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <p>Aperturas: <strong className="text-foreground">{d.opens}{d.maxOpens ? ` / ${d.maxOpens}` : ""}</strong></p>
                  <p>Vigencia: <strong className="text-foreground">{d.expiresAt ? fmt(d.expiresAt) : "Sin límite"}</strong></p>
                  <p>Creada: {fmt(d.createdAt)}</p>
                  <p>{d.password ? "Con contraseña" : "Sin contraseña"} · {d.allowDownload ? "Descarga sí" : "Descarga no"}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => copyLink(d)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium active:scale-95">
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                  <button onClick={() => shareWa(d)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium active:scale-95">
                    <Share2 className="h-3 w-3" /> WhatsApp
                  </button>
                  <a href={`/entrega/${d.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium active:scale-95">
                    <Eye className="h-3 w-3" /> Abrir
                  </a>
                  <button onClick={() => openEdit(d)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium active:scale-95">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button
                    onClick={() => { setDeliveryStatus(d.id, d.status === "blocked" ? "active" : "blocked"); refresh(); }}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium active:scale-95"
                  >
                    {d.status === "blocked" ? <><Unlock className="h-3 w-3" /> Desbloquear</> : <><Lock className="h-3 w-3" /> Bloquear</>}
                  </button>
                  <button
                    onClick={() => { if (confirm("¿Revocar esta entrega? El enlace dejará de funcionar.")) { setDeliveryStatus(d.id, "revoked"); refresh(); } }}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium active:scale-95"
                  >
                    <ShieldOff className="h-3 w-3" /> Revocar
                  </button>
                  <button onClick={() => setLogFor(d)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium active:scale-95">
                    <History className="h-3 w-3" /> Historial ({d.accessLog.length})
                  </button>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar la entrega ${d.folio}?`)) { deleteDelivery(d.id); refresh(); toast.success("Entrega eliminada."); } }}
                    className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive active:scale-95"
                  >
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-[11px] text-muted-foreground">
          <strong>Nota:</strong> almacenamiento local de demostración. Al conectar el backend, el archivo se servirá con URL firmada y la contraseña se guardará hasheada.
        </p>
      </main>

      {formOpen && (
        <DeliveryForm
          editing={editing}
          created={created}
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onClose={() => { setFormOpen(false); setCreated(null); }}
          onCopy={copyLink}
          onShare={shareWa}
        />
      )}

      {logFor && (
        <Modal title={`Historial · ${logFor.folio}`} onClose={() => setLogFor(null)}>
          {logFor.accessLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin accesos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {logFor.accessLog.map((a, i) => (
                <li key={i} className="rounded-xl border border-border bg-card p-2 text-[11px]">
                  <p className="font-semibold">{fmt(a.at)} · {a.ok ? "Acceso correcto" : "Intento fallido"}</p>
                  {a.note && <p className="text-muted-foreground">{a.note}</p>}
                  <p className="break-all text-muted-foreground">{a.userAgent}</p>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-border bg-background p-4 shadow-lg sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function DeliveryForm({
  editing, created, draft, setDraft, onSave, onClose, onCopy, onShare,
}: {
  editing: Delivery | null;
  created: Delivery | null;
  draft: DeliveryInput;
  setDraft: (d: DeliveryInput) => void;
  onSave: () => void;
  onClose: () => void;
  onCopy: (d: Delivery) => void;
  onShare: (d: Delivery) => void;
}) {
  const set = <K extends keyof DeliveryInput>(k: K, v: DeliveryInput[K]) => setDraft({ ...draft, [k]: v });
  return (
    <Modal title={editing && !created ? "Editar entrega" : created ? `Entrega ${created.folio}` : "Nueva entrega"} onClose={onClose}>
      {created && (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">Enlace generado</p>
          <p className="mt-1 break-all text-[11px] text-muted-foreground">{deliveryPublicUrl(created.token)}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => onCopy(created)} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground active:scale-95">
              <Copy className="h-3 w-3" /> Copiar enlace
            </button>
            <button onClick={() => onShare(created)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold active:scale-95">
              <Share2 className="h-3 w-3" /> Compartir
            </button>
          </div>
        </div>
      )}

      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
      >
        <Field label="Cliente *">
          <input className={inputCls} value={draft.clientName} onChange={(e) => set("clientName", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono / WhatsApp">
            <input className={inputCls} value={draft.phone ?? ""} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Correo">
            <input className={inputCls} value={draft.email ?? ""} onChange={(e) => set("email", e.target.value)} inputMode="email" />
          </Field>
        </div>
        <Field label="Trámite / Documento *">
          <input className={inputCls} value={draft.procedure} onChange={(e) => set("procedure", e.target.value)} />
        </Field>
        <Field label="Título del documento *">
          <input className={inputCls} value={draft.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Descripción o mensaje">
          <textarea className={inputCls} rows={2} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre del archivo">
            <input className={inputCls} value={draft.fileName ?? ""} onChange={(e) => set("fileName", e.target.value)} />
          </Field>
          <Field label="Contraseña (opcional)">
            <input type="password" className={inputCls} value={draft.password ?? ""} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        <Field label="URL del archivo *">
          <input className={inputCls} value={draft.fileUrl} onChange={(e) => set("fileUrl", e.target.value)} placeholder="https://..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiración (opcional)">
            <input
              type="datetime-local"
              className={inputCls}
              value={toLocalInput(draft.expiresAt)}
              onChange={(e) => set("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </Field>
          <Field label="Límite de aperturas">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.maxOpens ?? ""}
              onChange={(e) => set("maxOpens", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
        </div>
        <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
          <span className="text-sm">Permitir descarga</span>
          <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={draft.allowDownload} onChange={(e) => set("allowDownload", e.target.checked)} />
        </label>
        <Field label="Notas internas (no visibles para el cliente)">
          <textarea className={inputCls} rows={2} value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95">
            {editing && created ? "Guardar cambios" : editing ? "Guardar cambios" : "Crear entrega"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold active:scale-95">
            Cerrar
          </button>
        </div>
      </form>
    </Modal>
  );
}
