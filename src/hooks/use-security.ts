import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getSecurityContext, logSecurityEvent } from "@/lib/security.functions";

export function useSecurityContext() {
  const fn = useServerFn(getSecurityContext);
  return useQuery({
    queryKey: ["security-context"],
    queryFn: () => fn(),
    staleTime: 30_000,
    retry: false,
  });
}

/** Lista los factores TOTP verificados de la cuenta actual. */
export function useMfaFactors() {
  return useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
    staleTime: 10_000,
    retry: false,
  });
}

/** Cierre de sesión ordenado: cancela consultas, limpia caché y navega. */
export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const log = useServerFn(logSecurityEvent);

  return useCallback(
    async (reason: "logout" | "session_timeout" | "logout_all" = "logout") => {
      try {
        await log({ data: { action: reason, result: "success" } });
      } catch {
        /* la sesión pudo expirar; continuar con el cierre */
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut({ scope: reason === "logout_all" ? "global" : "local" });
      navigate({ to: "/auth", replace: true, search: { timeout: reason === "session_timeout" } });
    },
    [log, navigate, queryClient],
  );
}

/** Cierre automático de sesión por inactividad en áreas administrativas. */
export function useInactivityLogout(minutes: number | undefined, enabled: boolean) {
  const signOut = useSignOut();
  const [warning, setWarning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !minutes) return;
    const ms = minutes * 60_000;

    const reset = () => {
      setWarning(false);
      if (timer.current) clearTimeout(timer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      warnTimer.current = setTimeout(() => setWarning(true), Math.max(ms - 60_000, ms * 0.8));
      timer.current = setTimeout(() => {
        void signOut("session_timeout");
      }, ms);
    };

    const events = ["click", "keydown", "touchstart", "scroll", "mousemove"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
  }, [enabled, minutes, signOut]);

  return warning;
}
