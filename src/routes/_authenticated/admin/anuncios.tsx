import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Megaphone } from "lucide-react";
import { toast } from "sonner";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleActive,
  validateAnnouncement,
  ANNOUNCEMENT_TYPE_LABEL,
  type Announcement,
  type AnnouncementInput,
  type AnnouncementType,
} from "@/lib/announcements";

export const Route = createFileRoute("/admin/anuncios")({
  head: () => ({
    meta: [
      { title: "Anuncios — MA² Digital" },
      { name: "description", content: "Administración de anuncios de la página principal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnunciosAdmin,
});

const TYPES: AnnouncementType[] = ["info", "important", "urgent", "critical"];

function emptyForm(order: number): AnnouncementInput {
  return {
    title: "",
    message: "",
    type: "info",
    active: true,
    startAt: null,
    endAt: null,
    order,
  };
}

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function AnunciosAdmin() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnnouncementInput>(() => emptyForm(1));
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);

  const refresh = () => setItems(listAnnouncements());

  useEffect(() => {
    refresh();
  }, []);

  const nextOrder = useMemo(
    () => (items.length === 0 ? 1 : Math.max(...items.map((a) => a.order)) + 1),
    [items]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(nextOrder));
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      active: a.active,
      startAt: a.startAt ?? null,
      endAt: a.endAt ?? null,
      order: a.order,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateAnnouncement(form);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      if (editing) {
        updateAnnouncement(editing.id, form);
        toast.success("Anuncio actualizado");
      } else {
        createAnnouncement(form);
        toast.success("Anuncio creado");
      }
      refresh();
      closeForm();
    } catch {
      toast.error("No se pudo guardar el anuncio");
    }
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    const ok = deleteAnnouncement(confirmDelete.id);
    if (ok) {
      toast.success("Anuncio eliminado");
      refresh();
    } else {
      toast.error("No se pudo eliminar");
    }
    setConfirmDelete(null);
  };

  const doToggle = (a: Announcement) => {
    const res = toggleActive(a.id);
    if (res) {
      toast.success(res.active ? "Anuncio activado" : "Anuncio desactivado");
      refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/admin/dashboard"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold">Anuncios</h1>
            <p className="text-[11px] text-muted-foreground">Se muestran arriba en la página principal</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-semibold">No hay anuncios todavía</p>
            <p className="mt-1 text-xs text-muted-foreground">Crea el primero para mostrarlo en la página principal.</p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Crear anuncio
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className={`rounded-2xl border p-3 shadow-sm ${
                  a.active ? "border-border bg-card" : "border-border bg-muted/40 opacity-70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        #{a.order}
                      </span>
                      <p className="truncate text-sm font-semibold">{a.title}</p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {ANNOUNCEMENT_TYPE_LABEL[a.type]}
                      </span>
                      {!a.active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.message}</p>
                    {(a.startAt || a.endAt) && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {a.startAt ? `Desde: ${new Date(a.startAt).toLocaleString()}` : "Sin inicio"}
                        {" · "}
                        {a.endAt ? `Hasta: ${new Date(a.endAt).toLocaleString()}` : "Sin fin"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => doToggle(a)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title={a.active ? "Desactivar" : "Activar"}
                    >
                      {a.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(a)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">{editing ? "Editar anuncio" : "Nuevo anuncio"}</h2>
              <button
                onClick={closeForm}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3 px-4 py-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Título *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mensaje *
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tipo
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as AnnouncementType })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ANNOUNCEMENT_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Inicio (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(form.startAt)}
                    onChange={(e) => setForm({ ...form, startAt: fromLocalInputValue(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fin (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(form.endAt)}
                    onChange={(e) => setForm({ ...form, endAt: fromLocalInputValue(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <span>Activo</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
                >
                  {editing ? "Guardar cambios" : "Crear anuncio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
            <h3 className="text-sm font-semibold">Eliminar anuncio</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              ¿Seguro que quieres eliminar "{confirmDelete.title}"? Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={doDelete}
                className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white active:scale-95"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}