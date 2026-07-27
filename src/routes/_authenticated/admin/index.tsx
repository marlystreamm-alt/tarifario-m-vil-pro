import { createFileRoute, redirect } from "@tanstack/react-router";

// El acceso demo fue retirado: la autenticación real vive en /auth y el
// gate de sesión en el layout _authenticated.
export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard", replace: true });
  },
});
