import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  validateUser,
  defaultPermissionsForRole,
  countActivePermissions,
  emptyUserInput,
  ALL_PERMISSIONS,
  PERMISSION_LABEL,
  ROLE_LABEL,
  type InternalUser,
  type InternalUserInput,
  type UserRole,
  type PermissionKey,
} from "@/lib/users";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios — MA² Digital" },
      { name: "description", content: "Administración de usuarios internos y permisos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsuariosAdmin,
});

const ROLES: UserRole[] = ["admin", "assistant", "reseller", "provider"];

function UsuariosAdmin() {
  const [items, setItems] = useState<InternalUser[]>([]);
  const [editing, setEditing] = useState<InternalUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InternalUserInput>(() => emptyUserInput("assistant"));
  const [confirmDelete, setConfirmDelete] = useState<InternalUser | null>(null);

  const refresh = () => setItems(listUsers());

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyUserInput("assistant"));
    setShowForm(true);
  };

  const openEdit = (u: InternalUser) => {
    setEditing(u);
    setForm({
      name: u.name,
      login: u.login,
      email: u.email ?? "",
      password: u.password ?? "",
      phone: u.phone ?? "",
      role: u.role,
      active: u.active,
      notes: u.notes ?? "",
      permissions: u.permissions,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const changeRole = (role: UserRole) => {
    // Al cambiar el rol, si es creación o el usuario no personalizó aún los
    // permisos, aplicamos el preset del rol. En edición mantenemos lo que
    // el admin ya tenga, pero como conveniencia ofrecemos también resetear.
    setForm((prev) => ({
      ...prev,
      role,
      permissions: editing ? prev.permissions : defaultPermissionsForRole(role),
    }));
  };

  const resetPermsFromRole = () => {
    setForm((prev) => ({ ...prev, permissions: defaultPermissionsForRole(prev.role) }));
    toast.success("Permisos restablecidos según el rol");
  };

  const togglePerm = (k: PermissionKey) => {
    setForm((prev) => ({ ...prev, permissions: { ...prev.permissions, [k]: !prev.permissions[k] } }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUser(form, { existingId: editing?.id });
    if (err) {
      toast.error(err);
      return;
    }
    try {
      if (editing) {
        updateUser(editing.id, form);
        toast.success("Usuario actualizado");
      } else {
        createUser(form);
        toast.success("Usuario creado");
      }
      refresh();
      closeForm();
    } catch {
      toast.error("No se pudo guardar el usuario");
    }
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    const ok = deleteUser(confirmDelete.id);
    if (ok) {
      toast.success("Usuario eliminado");
      refresh();
    } else {
      toast.error("No se pudo eliminar");
    }
    setConfirmDelete(null);
  };

  const doToggle = (u: InternalUser) => {
    const res = toggleUserActive(u.id);
    if (res) {
      toast.success(res.active ? "Usuario activado" : "Usuario desactivado");
      refresh();
    }
  };

  const grouped = useMemo(() => {
    const g: Record<UserRole, InternalUser[]> = { admin: [], assistant: [], reseller: [], provider: [] };
    for (const u of items) g[u.role].push(u);
    return g;
  }, [items]);

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
            <h1 className="text-base font-bold">Usuarios y permisos</h1>
            <p className="text-[11px] text-muted-foreground">Administradores, asistentes y proveedores</p>
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
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-semibold">Aún no hay usuarios</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crea el primero para asignar permisos internos. La autenticación real se conectará después.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Crear usuario
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {ROLES.map((role) =>
              grouped[role].length === 0 ? null : (
                <section key={role}>
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {ROLE_LABEL[role]} · {grouped[role].length}
                  </h2>
                  <ul className="space-y-2">
                    {grouped[role].map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        onEdit={() => openEdit(u)}
                        onToggle={() => doToggle(u)}
                        onDelete={() => setConfirmDelete(u)}
                      />
                    ))}
                  </ul>
                </section>
              )
            )}
          </div>
        )}

        <p className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-[11px] text-muted-foreground">
          <strong>Nota:</strong> Los usuarios se guardan localmente en este dispositivo. Al conectar Lovable Cloud
          se sincronizarán con Supabase Auth y la tabla <code>user_roles</code> sin cambiar esta interfaz.
        </p>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
              <h2 className="text-sm font-semibold">{editing ? "Editar usuario" : "Nuevo usuario"}</h2>
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
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  maxLength={120}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Usuario de acceso *
                </label>
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="usuario o correo"
                  maxLength={120}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Correo (opcional)
                  </label>
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="correo@ejemplo.com"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Contraseña (demo)
                  </label>
                  <input
                    type="text"
                    value={form.password ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    maxLength={60}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    maxLength={40}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Rol
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => changeRole(e.target.value as UserRole)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado
                </label>
                <select
                  value={form.active ? "active" : "inactive"}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === "active" }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Notas (opcional)
                </label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Permisos</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetPermsFromRole}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Aplicar preset del rol
                  </button>
                </div>
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ALL_PERMISSIONS.map((k) => (
                    <li key={k} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                      <span className="text-xs">{PERMISSION_LABEL[k]}</span>
                      <button
                        type="button"
                        onClick={() => togglePerm(k)}
                        role="switch"
                        aria-checked={form.permissions[k]}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                          form.permissions[k] ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            form.permissions[k] ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

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
                  {editing ? "Guardar cambios" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
            <h3 className="text-sm font-semibold">Eliminar usuario</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              ¿Seguro que quieres eliminar a "{confirmDelete.name}"? Esta acción no se puede deshacer.
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

function UserCard({
  user,
  onEdit,
  onToggle,
  onDelete,
}: {
  user: InternalUser;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activePerms = countActivePermissions(user.permissions);
  return (
    <li
      className={`rounded-2xl border p-3 shadow-sm ${
        user.active ? "border-border bg-card" : "border-border bg-muted/40 opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {ROLE_LABEL[user.role]}
            </span>
            {!user.active && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Inactivo
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.login}</p>
          {user.phone && <p className="text-[11px] text-muted-foreground">{user.phone}</p>}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 text-[11px] font-medium text-primary hover:underline"
          >
            {activePerms} de {ALL_PERMISSIONS.length} permisos {open ? "▴" : "▾"}
          </button>
          {open && (
            <ul className="mt-2 flex flex-wrap gap-1">
              {ALL_PERMISSIONS.filter((k) => user.permissions[k]).map((k) => (
                <li
                  key={k}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {PERMISSION_LABEL[k]}
                </li>
              ))}
              {activePerms === 0 && (
                <li className="text-[10px] text-muted-foreground">Sin permisos asignados</li>
              )}
            </ul>
          )}
          {user.notes && (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{user.notes}</p>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">
            Creado: {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggle}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            title={user.active ? "Desactivar" : "Activar"}
          >
            {user.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
