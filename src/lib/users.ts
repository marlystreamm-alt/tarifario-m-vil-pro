// Repositorio de usuarios internos (administradores, asistentes, proveedores).
//
// Capa de persistencia aislada: hoy usa localStorage; mañana se sustituye por
// Supabase (tablas `users` + `user_roles` + tabla de permisos) sin cambiar la
// interfaz. Toda la UI debe importar SOLO las funciones exportadas aquí.

export type UserRole = "admin" | "assistant" | "provider";

export type PermissionKey =
  | "viewInventory"
  | "assignAccounts"
  | "viewCosts"
  | "createOrders"
  | "editOrders"
  | "viewClients"
  | "manageSupport"
  | "viewPurchases"
  | "viewProviders"
  | "viewFinances"
  | "addBalance"
  | "approveWithdrawals";

export type Permissions = Record<PermissionKey, boolean>;

export interface InternalUser {
  id: string;
  name: string;
  login: string;
  phone?: string | null;
  role: UserRole;
  active: boolean;
  notes?: string | null;
  permissions: Permissions;
  createdAt: string;
  updatedAt: string;
}

export type InternalUserInput = Omit<InternalUser, "id" | "createdAt" | "updatedAt">;

const STORAGE_KEY = "ma2-users-v1";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  assistant: "Asistente",
  provider: "Proveedor",
};

export const PERMISSION_LABEL: Record<PermissionKey, string> = {
  viewInventory: "Ver inventario",
  assignAccounts: "Asignar cuentas",
  viewCosts: "Ver costos",
  createOrders: "Crear pedidos",
  editOrders: "Editar pedidos",
  viewClients: "Ver clientes",
  manageSupport: "Gestionar soportes",
  viewPurchases: "Ver compras",
  viewProviders: "Ver proveedores",
  viewFinances: "Ver finanzas",
  addBalance: "Agregar saldo",
  approveWithdrawals: "Aprobar retiros",
};

export const ALL_PERMISSIONS: PermissionKey[] = Object.keys(PERMISSION_LABEL) as PermissionKey[];

function allPerms(value: boolean): Permissions {
  return ALL_PERMISSIONS.reduce((acc, k) => {
    acc[k] = value;
    return acc;
  }, {} as Permissions);
}

export function defaultPermissionsForRole(role: UserRole): Permissions {
  if (role === "admin") return allPerms(true);
  if (role === "assistant") {
    return {
      ...allPerms(false),
      viewInventory: true,
      assignAccounts: true,
      createOrders: true,
      editOrders: true,
      viewClients: true,
      manageSupport: true,
    };
  }
  return {
    ...allPerms(false),
    viewInventory: true,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  return "us_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizePerms(p: Partial<Permissions> | undefined): Permissions {
  const base = allPerms(false);
  if (!p) return base;
  for (const k of ALL_PERMISSIONS) {
    if (typeof p[k] === "boolean") base[k] = p[k] as boolean;
  }
  return base;
}

function readRaw(): InternalUser[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InternalUser[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((u) => ({ ...u, permissions: normalizePerms(u.permissions) }));
  } catch {
    return [];
  }
}

function writeRaw(list: InternalUser[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function listUsers(): InternalUser[] {
  return readRaw().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getUser(id: string): InternalUser | null {
  return readRaw().find((u) => u.id === id) ?? null;
}

export function validateUser(
  input: Partial<InternalUserInput>,
  opts: { existingId?: string } = {}
): string | null {
  if (!input.name || !input.name.trim()) return "El nombre es obligatorio.";
  if (!input.login || !input.login.trim()) return "El correo o usuario es obligatorio.";
  if (input.login.length > 120) return "El correo o usuario es demasiado largo.";
  if (input.name.length > 120) return "El nombre es demasiado largo.";
  if (input.phone && input.phone.length > 40) return "El teléfono es demasiado largo.";
  if (input.notes && input.notes.length > 500) return "Las notas son demasiado largas.";
  if (!input.role) return "Selecciona un rol.";
  const login = input.login.trim().toLowerCase();
  const dup = readRaw().find((u) => u.login.trim().toLowerCase() === login && u.id !== opts.existingId);
  if (dup) return "Ya existe un usuario con ese correo o usuario.";
  return null;
}

export function createUser(input: InternalUserInput): InternalUser {
  const t = nowIso();
  const item: InternalUser = {
    ...input,
    permissions: normalizePerms(input.permissions),
    id: uid(),
    createdAt: t,
    updatedAt: t,
  };
  const list = readRaw();
  list.push(item);
  writeRaw(list);
  return item;
}

export function updateUser(id: string, patch: Partial<InternalUserInput>): InternalUser | null {
  const list = readRaw();
  const idx = list.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const merged: InternalUser = {
    ...list[idx],
    ...patch,
    permissions: patch.permissions ? normalizePerms(patch.permissions) : list[idx].permissions,
    updatedAt: nowIso(),
  };
  list[idx] = merged;
  writeRaw(list);
  return merged;
}

export function deleteUser(id: string): boolean {
  const list = readRaw();
  const next = list.filter((u) => u.id !== id);
  if (next.length === list.length) return false;
  writeRaw(next);
  return true;
}

export function toggleUserActive(id: string): InternalUser | null {
  const u = getUser(id);
  if (!u) return null;
  return updateUser(id, { active: !u.active });
}

export function countActivePermissions(p: Permissions): number {
  return ALL_PERMISSIONS.reduce((n, k) => n + (p[k] ? 1 : 0), 0);
}

export function emptyUserInput(role: UserRole = "assistant"): InternalUserInput {
  return {
    name: "",
    login: "",
    phone: "",
    role,
    active: true,
    notes: "",
    permissions: defaultPermissionsForRole(role),
  };
}
