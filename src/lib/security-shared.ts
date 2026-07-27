// Tipos y utilidades de seguridad compartidos entre cliente y servidor.
// NO contiene secretos ni acceso a base de datos.

export type AppRole = "superadmin" | "admin" | "employee";

export const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  employee: "Empleado",
};

/** Acciones críticas que exigen segundo factor reciente. */
export type CriticalAction =
  | "backup_restore"
  | "backup_export"
  | "reveal_provider_link"
  | "delivery_regenerate_password"
  | "delivery_revoke"
  | "data_delete"
  | "permissions_change"
  | "security_settings_change"
  | "disable_2fa"
  | "recovery_codes_regenerate";

export const CRITICAL_ACTION_LABEL: Record<CriticalAction, string> = {
  backup_restore: "Restaurar un respaldo",
  backup_export: "Exportar respaldo completo",
  reveal_provider_link: "Revelar enlace del proveedor",
  delivery_regenerate_password: "Regenerar contraseña de Entrega Blindada",
  delivery_revoke: "Revocar una entrega",
  data_delete: "Eliminar datos",
  permissions_change: "Cambiar permisos",
  security_settings_change: "Cambiar configuración de seguridad",
  disable_2fa: "Desactivar verificación en dos pasos",
  recovery_codes_regenerate: "Regenerar códigos de recuperación",
};

/** Rol mínimo requerido por acción (principio de mínimo privilegio). */
export const CRITICAL_ACTION_ROLES: Record<CriticalAction, AppRole[]> = {
  backup_restore: ["superadmin"],
  backup_export: ["superadmin"],
  reveal_provider_link: ["superadmin", "admin"],
  delivery_regenerate_password: ["superadmin", "admin"],
  delivery_revoke: ["superadmin", "admin"],
  data_delete: ["superadmin"],
  permissions_change: ["superadmin"],
  security_settings_change: ["superadmin"],
  disable_2fa: ["superadmin", "admin"],
  recovery_codes_regenerate: ["superadmin", "admin", "employee"],
};

/** Ventana de vigencia del segundo factor para acciones críticas (segundos). */
export const STEP_UP_WINDOW_SECONDS = 600;

/** Enmascara valores sensibles para mostrarlos en pantalla. */
export function maskSecret(value: string | null | undefined, visible = 4): string {
  if (!value) return "••••••••";
  const clean = String(value);
  if (clean.length <= visible) return "•".repeat(8);
  return "•".repeat(Math.max(8, clean.length - visible)) + clean.slice(-visible);
}

export function maskUrl(url: string | null | undefined): string {
  if (!url) return "••••••••";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/••••••••`;
  } catch {
    return "••••••••";
  }
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return "••••";
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, user.length - 2))}@${domain}`;
}

export const SECURITY_EVENT_LABEL: Record<string, string> = {
  login_success: "Inicio de sesión",
  login_failed: "Fallo de inicio de sesión",
  logout: "Cierre de sesión",
  logout_all: "Cierre de todas las sesiones",
  session_timeout: "Cierre por inactividad",
  mfa_enrolled: "Activación de 2FA",
  mfa_disabled: "Desactivación de 2FA",
  mfa_challenge_success: "Segundo factor verificado",
  mfa_challenge_failed: "Segundo factor incorrecto",
  recovery_codes_generated: "Códigos de recuperación generados",
  recovery_code_used: "Uso de código de recuperación",
  backup_export: "Exportación de respaldo",
  backup_restore: "Restauración de respaldo",
  reveal_provider_link: "Revelación de enlace de proveedor",
  delivery_revoke: "Revocación de entrega",
  delivery_regenerate_password: "Regeneración de contraseña de entrega",
  permissions_change: "Cambio de permisos",
  security_settings_change: "Cambio de configuración de seguridad",
  data_delete: "Eliminación de datos",
  role_change: "Cambio de rol",
  step_up_denied: "Acción crítica denegada",
};

export function eventLabel(action: string): string {
  return SECURITY_EVENT_LABEL[action] ?? action;
}
