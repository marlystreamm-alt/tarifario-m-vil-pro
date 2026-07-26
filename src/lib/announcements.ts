// Repositorio de anuncios.
//
// Capa de persistencia aislada: hoy usa localStorage; mañana se cambia por
// llamadas a Supabase sin tocar la UI. Toda la app debe importar SOLO las
// funciones exportadas aquí, nunca acceder a localStorage directamente.

export type AnnouncementType = "info" | "important" | "urgent" | "critical";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  active: boolean;
  startAt?: string | null; // ISO
  endAt?: string | null; // ISO
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementInput = Omit<Announcement, "id" | "createdAt" | "updatedAt">;

const STORAGE_KEY = "ma2-announcements-v1";

export const ANNOUNCEMENTS_EVENT = "ma2-announcements-changed";

function emitChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_EVENT));
}

/** Suscripción reactiva: la UI se actualiza sin recargar. */
export function subscribeAnnouncements(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener(ANNOUNCEMENTS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ANNOUNCEMENTS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  return "an_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readRaw(): Announcement[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Announcement[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(list: Announcement[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
  emitChange();
}

function seedIfNeeded(): void {
  if (!isBrowser()) return;
  const existing = readRaw();
  if (existing.length > 0) return;
  {
    const t = nowIso();
    const seed: Announcement[] = [
      {
        id: uid(),
        title: "Bienvenido a MA² Digital",
        message: "Streaming y trámites digitales en un solo lugar. Solicita por WhatsApp.",
        type: "info",
        active: true,
        startAt: null,
        endAt: null,
        order: 1,
        createdAt: t,
        updatedAt: t,
      },
      {
        id: uid(),
        title: "Revisa tus pedidos pendientes",
        message: "Consulta el estado de tu pedido con tu folio en la sección Consultar pedido.",
        type: "important",
        active: true,
        startAt: null,
        endAt: null,
        order: 2,
        createdAt: t,
        updatedAt: t,
      },
    ];
    writeRaw(seed);
  }
}

export function listAnnouncements(): Announcement[] {
  seedIfNeeded();
  return readRaw().sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function getActiveAnnouncements(now: Date = new Date()): Announcement[] {
  const t = now.getTime();
  return listAnnouncements().filter((a) => {
    if (!a.active) return false;
    if (a.startAt && new Date(a.startAt).getTime() > t) return false;
    if (a.endAt && new Date(a.endAt).getTime() < t) return false;
    return true;
  });
}

export function createAnnouncement(input: AnnouncementInput): Announcement {
  const t = nowIso();
  const item: Announcement = { ...input, id: uid(), createdAt: t, updatedAt: t };
  const list = readRaw();
  list.push(item);
  writeRaw(list);
  return item;
}

export function updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Announcement | null {
  const list = readRaw();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const updated: Announcement = { ...list[idx], ...patch, updatedAt: nowIso() };
  list[idx] = updated;
  writeRaw(list);
  return updated;
}

export function deleteAnnouncement(id: string): boolean {
  const list = readRaw();
  const next = list.filter((a) => a.id !== id);
  if (next.length === list.length) return false;
  writeRaw(next);
  return true;
}

export function toggleActive(id: string): Announcement | null {
  const list = readRaw();
  const item = list.find((a) => a.id === id);
  if (!item) return null;
  return updateAnnouncement(id, { active: !item.active });
}

export function validateAnnouncement(input: Partial<AnnouncementInput>): string | null {
  if (!input.title || !input.title.trim()) return "El título es obligatorio.";
  if (!input.message || !input.message.trim()) return "El mensaje es obligatorio.";
  if (input.startAt && input.endAt) {
    const s = new Date(input.startAt).getTime();
    const e = new Date(input.endAt).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && e < s) {
      return "La fecha de fin no puede ser anterior a la de inicio.";
    }
  }
  return null;
}

export const ANNOUNCEMENT_TYPE_LABEL: Record<AnnouncementType, string> = {
  info: "Informativo",
  important: "Importante",
  urgent: "Urgente",
  critical: "Crítico",
};