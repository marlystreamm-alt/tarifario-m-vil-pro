// Repositorio de "Entrega Protegida".
//
// Capa de persistencia aislada: hoy usa localStorage; mañana se migra a
// Supabase (tabla `deliveries` + `delivery_access_logs` + Storage para el
// archivo) sin cambiar la interfaz pública de este módulo.
//
// SEGURIDAD (pendiente al migrar):
//   - `password` se guarda hoy en texto plano SOLO por ser demo local.
//     Al conectar Supabase debe guardarse hasheada (bcrypt/argon2) y validarse
//     en el servidor, nunca en el cliente.
//   - `fileUrl` debe servirse con URL firmada temporal desde Storage y jamás
//     enviarse al cliente antes de validar estado, contraseña y límites.

export type DeliveryStatus = "active" | "blocked" | "expired" | "revoked";

export interface AccessLogEntry {
  at: string; // ISO
  userAgent: string;
  ok: boolean;
  note?: string;
}

export interface Delivery {
  id: string;
  token: string;
  folio: string;
  clientName: string;
  phone?: string | null;
  email?: string | null;
  procedure: string;
  title: string;
  description?: string | null;
  fileName?: string | null;
  fileUrl: string;
  /** DEMO: texto plano local. Migrar a hash en servidor. */
  password?: string | null;
  createdAt: string;
  expiresAt?: string | null; // ISO
  maxOpens?: number | null;
  opens: number;
  allowDownload: boolean;
  status: DeliveryStatus;
  notes?: string | null;
  accessLog: AccessLogEntry[];
  updatedAt: string;
}

export type DeliveryInput = Omit<
  Delivery,
  "id" | "token" | "folio" | "createdAt" | "updatedAt" | "opens" | "accessLog" | "status"
> & { status?: DeliveryStatus };

const STORAGE_KEY = "ma2-deliveries-v1";
const FOLIO_KEY = "ma2-deliveries-folio-v1";
export const DELIVERIES_EVENT = "ma2-deliveries-changed";

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  active: "Activa",
  blocked: "Bloqueada",
  expired: "Expirada",
  revoked: "Revocada",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  return "dl_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Token largo y aleatorio (crypto cuando está disponible). */
export function generateToken(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const len = 40;
  let out = "";
  const g = isBrowser() ? window.crypto : (globalThis.crypto as Crypto | undefined);
  if (g && typeof g.getRandomValues === "function") {
    const buf = new Uint32Array(len);
    g.getRandomValues(buf);
    for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
    return out;
  }
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function emitChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(DELIVERIES_EVENT));
}

export function subscribeDeliveries(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener(DELIVERIES_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(DELIVERIES_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function readRaw(): Delivery[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Delivery[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d) => ({ ...d, accessLog: Array.isArray(d.accessLog) ? d.accessLog : [] }));
  } catch {
    return [];
  }
}

function writeRaw(list: Delivery[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
  emitChange();
}

function nextFolio(): string {
  const year = new Date().getFullYear();
  let n = 1;
  if (isBrowser()) {
    try {
      const raw = localStorage.getItem(FOLIO_KEY);
      const parsed = raw ? (JSON.parse(raw) as { year: number; n: number }) : null;
      n = parsed && parsed.year === year ? parsed.n + 1 : 1;
      localStorage.setItem(FOLIO_KEY, JSON.stringify({ year, n }));
    } catch {
      n = readRaw().length + 1;
    }
  }
  return `MA2-${year}-${String(n).padStart(4, "0")}`;
}

/** Estado efectivo considerando expiración y límite de aperturas. */
export function effectiveStatus(d: Delivery): DeliveryStatus {
  if (d.status === "revoked" || d.status === "blocked") return d.status;
  if (d.expiresAt && new Date(d.expiresAt).getTime() < Date.now()) return "expired";
  if (typeof d.maxOpens === "number" && d.maxOpens > 0 && d.opens >= d.maxOpens) return "expired";
  return d.status === "expired" ? "expired" : "active";
}

function seedIfNeeded(): void {
  if (!isBrowser()) return;
  if (localStorage.getItem(STORAGE_KEY)) return;
  const t = nowIso();
  const demo: Delivery = {
    id: uid(),
    token: generateToken(),
    folio: nextFolio(),
    clientName: "Cliente Demo",
    phone: "5215555555555",
    email: "",
    procedure: "Acta de nacimiento",
    title: "Acta de nacimiento certificada",
    description: "Documento listo para descarga. Revisa que los datos sean correctos.",
    fileName: "acta-demo.pdf",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    password: "",
    createdAt: t,
    expiresAt: null,
    maxOpens: null,
    opens: 0,
    allowDownload: true,
    status: "active",
    notes: "Entrega de demostración creada automáticamente.",
    accessLog: [],
    updatedAt: t,
  };
  writeRaw([demo]);
}

export function listDeliveries(): Delivery[] {
  seedIfNeeded();
  return readRaw().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDelivery(id: string): Delivery | null {
  return readRaw().find((d) => d.id === id) ?? null;
}

export function getDeliveryByToken(token: string): Delivery | null {
  seedIfNeeded();
  return readRaw().find((d) => d.token === token) ?? null;
}

export function validateDelivery(input: Partial<DeliveryInput>): string | null {
  if (!input.clientName || !input.clientName.trim()) return "El nombre del cliente es obligatorio.";
  if (input.clientName.length > 120) return "El nombre es demasiado largo.";
  if (!input.procedure || !input.procedure.trim()) return "Indica el trámite o documento.";
  if (!input.title || !input.title.trim()) return "El título del documento es obligatorio.";
  if (!input.fileUrl || !input.fileUrl.trim()) return "La URL del archivo es obligatoria.";
  if (!/^https?:\/\//i.test(input.fileUrl.trim())) return "La URL debe iniciar con http:// o https://";
  if (input.email && input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    return "El correo no es válido.";
  if (input.phone && input.phone.length > 40) return "El teléfono es demasiado largo.";
  if (input.description && input.description.length > 600) return "La descripción es demasiado larga.";
  if (input.notes && input.notes.length > 600) return "Las notas son demasiado largas.";
  if (typeof input.maxOpens === "number" && (input.maxOpens < 1 || input.maxOpens > 9999))
    return "El límite de aperturas debe estar entre 1 y 9999.";
  return null;
}

export function createDelivery(input: DeliveryInput): Delivery {
  seedIfNeeded();
  const t = nowIso();
  const item: Delivery = {
    ...input,
    id: uid(),
    token: generateToken(),
    folio: nextFolio(),
    opens: 0,
    status: input.status ?? "active",
    accessLog: [],
    createdAt: t,
    updatedAt: t,
  };
  const list = readRaw();
  list.push(item);
  writeRaw(list);
  return item;
}

export function updateDelivery(id: string, patch: Partial<Delivery>): Delivery | null {
  const list = readRaw();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const merged: Delivery = { ...list[idx], ...patch, id: list[idx].id, updatedAt: nowIso() };
  list[idx] = merged;
  writeRaw(list);
  return merged;
}

export function deleteDelivery(id: string): boolean {
  const list = readRaw();
  const next = list.filter((d) => d.id !== id);
  if (next.length === list.length) return false;
  writeRaw(next);
  return true;
}

export function setDeliveryStatus(id: string, status: DeliveryStatus): Delivery | null {
  return updateDelivery(id, { status });
}

/** Registra un acceso (exitoso o fallido) y suma apertura si corresponde. */
export function registerAccess(id: string, ok: boolean, note?: string, countOpen = true): Delivery | null {
  const d = getDelivery(id);
  if (!d) return null;
  const entry: AccessLogEntry = {
    at: nowIso(),
    userAgent: isBrowser() ? navigator.userAgent.slice(0, 200) : "desconocido",
    ok,
    note,
  };
  const accessLog = [entry, ...d.accessLog].slice(0, 100);
  return updateDelivery(id, { accessLog, opens: ok && countOpen ? d.opens + 1 : d.opens });
}

/** Evita contar varias aperturas por refrescos seguidos (ventana de 60s). */
const SESSION_PREFIX = "ma2-delivery-open-";
export function recentlyOpened(token: string, windowMs = 60_000): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + token);
    if (!raw) return false;
    return Date.now() - Number(raw) < windowMs;
  } catch {
    return false;
  }
}

export function markOpened(token: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(SESSION_PREFIX + token, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function deliveryPublicUrl(token: string): string {
  const origin = isBrowser() ? window.location.origin : "";
  return `${origin}/entrega/${token}`;
}

export function emptyDeliveryInput(): DeliveryInput {
  return {
    clientName: "",
    phone: "",
    email: "",
    procedure: "",
    title: "",
    description: "",
    fileName: "",
    fileUrl: "",
    password: "",
    expiresAt: null,
    maxOpens: null,
    allowDownload: true,
    notes: "",
  };
}
