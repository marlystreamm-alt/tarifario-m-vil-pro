// Funciones de servidor de la capa de seguridad.
// Toda validación crítica (rol, segundo factor reciente, auditoría) ocurre aquí,
// nunca sólo en el frontend.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CRITICAL_ACTION_ROLES,
  STEP_UP_WINDOW_SECONDS,
  type AppRole,
  type CriticalAction,
} from "./security-shared";

type Claims = Record<string, unknown> & {
  sub?: string;
  email?: string;
  aal?: string;
  amr?: Array<{ method?: string; timestamp?: number }>;
};

function requestMeta() {
  const req = getRequest();
  const h = req?.headers;
  const ip =
    h?.get("cf-connecting-ip") ??
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h?.get("x-real-ip") ??
    null;
  return { ip, userAgent: h?.get("user-agent")?.slice(0, 250) ?? null };
}

/** Momento (epoch s) de la última verificación de segundo factor, si existe. */
function lastMfaAt(claims: Claims): number | null {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const totp = amr
    .filter((e) => e?.method === "totp" || e?.method === "mfa/totp")
    .map((e) => Number(e?.timestamp ?? 0))
    .filter((n) => n > 0);
  if (!totp.length) return null;
  return Math.max(...totp);
}

function stepUpFresh(claims: Claims): boolean {
  if (claims.aal !== "aal2") return false;
  const at = lastMfaAt(claims);
  if (!at) return false;
  return Math.floor(Date.now() / 1000) - at <= STEP_UP_WINDOW_SECONDS;
}

async function writeEvent(input: {
  userId?: string | null;
  email?: string | null;
  action: string;
  result?: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { ip, userAgent } = requestMeta();
  await supabaseAdmin.from("security_events").insert({
    user_id: input.userId ?? null,
    actor_email: input.email ?? null,
    action: input.action,
    result: input.result ?? "success",
    ip,
    user_agent: userAgent,
    metadata: (input.metadata ?? {}) as never,
  });
}

async function roleOf(userId: string): Promise<AppRole> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (roles.includes("superadmin")) return "superadmin";
  if (roles.includes("admin")) return "admin";
  return "employee";
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Contexto de seguridad de la sesión actual. */
export const getSecurityContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Claims;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const role = await roleOf(context.userId);
    const [{ data: settings }, { count: codesLeft }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("security_settings").select("*").eq("id", true).maybeSingle(),
      supabaseAdmin
        .from("recovery_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .is("used_at", null),
      supabaseAdmin.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    return {
      userId: context.userId,
      email: (claims.email as string) ?? null,
      fullName: profile?.full_name ?? null,
      role,
      aal: (claims.aal as string) ?? "aal1",
      mfaVerifiedAt: lastMfaAt(claims),
      stepUpFresh: stepUpFresh(claims),
      recoveryCodesLeft: codesLeft ?? 0,
      lastSignInAt: profile?.last_sign_in_at ?? null,
      inactivityMinutes: settings?.inactivity_minutes ?? 15,
      require2faSuperadmin: settings?.require_2fa_superadmin ?? true,
    };
  });

/** Marca el acceso y registra el evento de inicio de sesión. */
export const registerSignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Claims;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const previous = await supabaseAdmin
      .from("profiles")
      .select("last_sign_in_at")
      .eq("id", context.userId)
      .maybeSingle();
    await supabaseAdmin
      .from("profiles")
      .update({ last_sign_in_at: new Date().toISOString(), email: (claims.email as string) ?? null })
      .eq("id", context.userId);
    await writeEvent({
      userId: context.userId,
      email: (claims.email as string) ?? null,
      action: "login_success",
      metadata: { aal: claims.aal ?? "aal1" },
    });
    return { previousSignInAt: previous.data?.last_sign_in_at ?? null };
  });

/** Registra un evento de seguridad autenticado. */
export const logSecurityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        action: z.string().min(2).max(64),
        result: z.enum(["success", "failed", "denied"]).default("success"),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const claims = context.claims as Claims;
    await writeEvent({
      userId: context.userId,
      email: (claims.email as string) ?? null,
      action: data.action,
      result: data.result,
      metadata: data.metadata,
    });
    return { ok: true };
  });

/** Registra intentos de inicio de sesión fallidos (sin sesión). */
export const logLoginFailure = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().max(160).optional() }).parse(d))
  .handler(async ({ data }) => {
    await writeEvent({
      email: data.email ?? null,
      action: "login_failed",
      result: "failed",
    });
    return { ok: true };
  });

/**
 * Autoriza una acción crítica: valida rol y segundo factor reciente EN SERVIDOR
 * y deja constancia en la bitácora inmutable.
 */
export const authorizeCriticalAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        action: z.enum(Object.keys(CRITICAL_ACTION_ROLES) as [CriticalAction, ...CriticalAction[]]),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const claims = context.claims as Claims;
    const email = (claims.email as string) ?? null;
    const role = await roleOf(context.userId);

    if (!CRITICAL_ACTION_ROLES[data.action].includes(role)) {
      await writeEvent({
        userId: context.userId,
        email,
        action: "step_up_denied",
        result: "denied",
        metadata: { action: data.action, reason: "rol_insuficiente", role },
      });
      return { ok: false as const, reason: "rol_insuficiente" as const };
    }

    if (!stepUpFresh(claims)) {
      await writeEvent({
        userId: context.userId,
        email,
        action: "step_up_denied",
        result: "denied",
        metadata: { action: data.action, reason: "segundo_factor_no_reciente" },
      });
      return { ok: false as const, reason: "segundo_factor_no_reciente" as const };
    }

    await writeEvent({
      userId: context.userId,
      email,
      action: data.action,
      metadata: { ...(data.metadata ?? {}), role },
    });
    return { ok: true as const, reason: null };
  });

/** Genera 10 códigos de recuperación de un solo uso (se muestran una sola vez). */
export const generateRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Claims;
    if (claims.aal !== "aal2") {
      return { ok: false as const, reason: "requiere_2fa" as const, codes: [] as string[] };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const buf = new Uint32Array(10);
      crypto.getRandomValues(buf);
      const raw = Array.from(buf, (n) => alphabet[n % alphabet.length]).join("");
      codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    }
    await supabaseAdmin.from("recovery_codes").delete().eq("user_id", context.userId);
    const rows = await Promise.all(
      codes.map(async (c) => ({ user_id: context.userId, code_hash: await sha256Hex(c) })),
    );
    const { error } = await supabaseAdmin.from("recovery_codes").insert(rows);
    if (error) return { ok: false as const, reason: "error" as const, codes: [] as string[] };
    await writeEvent({
      userId: context.userId,
      email: (claims.email as string) ?? null,
      action: "recovery_codes_generated",
      metadata: { total: codes.length },
    });
    return { ok: true as const, reason: null, codes };
  });

/** Canjea un código de recuperación de un solo uso. */
export const useRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(6).max(24) }).parse(d))
  .handler(async ({ data, context }) => {
    const claims = context.claims as Claims;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await sha256Hex(data.code.trim().toUpperCase());
    const { data: row } = await supabaseAdmin
      .from("recovery_codes")
      .select("id")
      .eq("user_id", context.userId)
      .eq("code_hash", hash)
      .is("used_at", null)
      .maybeSingle();
    if (!row) {
      await writeEvent({
        userId: context.userId,
        email: (claims.email as string) ?? null,
        action: "recovery_code_used",
        result: "failed",
      });
      return { ok: false as const };
    }
    await supabaseAdmin
      .from("recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);
    await writeEvent({
      userId: context.userId,
      email: (claims.email as string) ?? null,
      action: "recovery_code_used",
    });
    return { ok: true as const };
  });

/** Cambia la configuración global de seguridad (solo Superadministrador + 2FA reciente). */
export const updateSecuritySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ inactivityMinutes: z.number().int().min(1).max(480) }).parse(d))
  .handler(async ({ data, context }) => {
    const claims = context.claims as Claims;
    const role = await roleOf(context.userId);
    if (role !== "superadmin" || !stepUpFresh(claims)) {
      await writeEvent({
        userId: context.userId,
        email: (claims.email as string) ?? null,
        action: "security_settings_change",
        result: "denied",
      });
      return { ok: false as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("security_settings")
      .update({ inactivity_minutes: data.inactivityMinutes, updated_by: context.userId })
      .eq("id", true);
    await writeEvent({
      userId: context.userId,
      email: (claims.email as string) ?? null,
      action: "security_settings_change",
      metadata: { inactivity_minutes: data.inactivityMinutes },
    });
    return { ok: true as const };
  });

/** Bitácora de seguridad (solo Superadministrador y Administrador). */
export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("security_events")
      .select("id, actor_email, action, result, ip, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

/** Lista de personas con acceso y su rol (Superadministrador y Administrador). */
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await roleOf(context.userId);
    if (role === "employee") return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email, last_sign_in_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, AppRole>();
    for (const r of roles ?? []) {
      const current = map.get(r.user_id);
      const next = r.role as AppRole;
      if (!current || next === "superadmin" || (next === "admin" && current === "employee")) {
        map.set(r.user_id, next);
      }
    }
    return (profiles ?? []).map((p) => ({ ...p, role: map.get(p.id) ?? ("employee" as AppRole) }));
  });

/** Cambia el rol de una cuenta (solo Superadministrador + 2FA reciente). */
export const setAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ userId: z.string().uuid(), role: z.enum(["superadmin", "admin", "employee"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const claims = context.claims as Claims;
    const role = await roleOf(context.userId);
    if (role !== "superadmin" || !stepUpFresh(claims)) {
      await writeEvent({
        userId: context.userId,
        email: (claims.email as string) ?? null,
        action: "role_change",
        result: "denied",
      });
      return { ok: false as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    await writeEvent({
      userId: context.userId,
      email: (claims.email as string) ?? null,
      action: "role_change",
      metadata: { target: data.userId, role: data.role },
    });
    return { ok: true as const };
  });
