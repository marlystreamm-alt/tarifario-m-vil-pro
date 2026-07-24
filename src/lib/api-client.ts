// Capa de integración de API.
//
// IMPORTANTE: NUNCA guardar API keys ni secretos en el frontend.
// Cuando se conecte el backend real:
//   1. Crear endpoints en /api/public/* (server routes) o server functions
//      protegidos con la key almacenada en Project Settings → Secrets.
//   2. El frontend solo llama a esos endpoints internos (mismo dominio),
//      nunca directamente al proveedor externo.
//   3. Reemplazar los stubs de abajo por fetch("/api/public/...").
//
// Por ahora todo devuelve datos simulados para que la UI sea utilizable hoy.

export type OrderStatus = "pendiente" | "en_proceso" | "listo" | "entregado" | "no_encontrado";

export type OrderLookupResult = {
  folio: string;
  status: OrderStatus;
  serviceName?: string;
  updatedAt?: string;
  message: string;
};

export type CreateOrderPayload = {
  clientName: string;
  phone: string;
  serviceId: number;
  serviceName: string;
  details: string;
};

// TODO: Reemplazar por POST /api/public/orders cuando exista backend.
export async function createOrder(payload: CreateOrderPayload): Promise<{ folio: string }> {
  // Simulación local: folio corto basado en timestamp.
  const folio = "MA2-" + Date.now().toString(36).toUpperCase().slice(-6);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("ma2-orders-sim") ?? "{}";
      const map = JSON.parse(raw) as Record<string, CreateOrderPayload & { folio: string; createdAt: string }>;
      map[folio] = { ...payload, folio, createdAt: new Date().toISOString() };
      localStorage.setItem("ma2-orders-sim", JSON.stringify(map));
    } catch {
      /* noop */
    }
  }
  return { folio };
}

// TODO: Reemplazar por GET /api/public/orders/:folio cuando exista backend.
export async function lookupOrder(folio: string): Promise<OrderLookupResult> {
  const f = folio.trim().toUpperCase();
  if (!f) {
    return { folio: f, status: "no_encontrado", message: "Introduce un folio válido." };
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("ma2-orders-sim") ?? "{}";
      const map = JSON.parse(raw) as Record<string, CreateOrderPayload & { folio: string; createdAt: string }>;
      const hit = map[f];
      if (hit) {
        return {
          folio: f,
          status: "pendiente",
          serviceName: hit.serviceName,
          updatedAt: hit.createdAt,
          message: "Solicitud recibida. La consulta automática se habilitará al conectar la API.",
        };
      }
    } catch {
      /* noop */
    }
  }
  return {
    folio: f,
    status: "no_encontrado",
    message: "No encontramos ese folio localmente. La consulta automática se habilitará al conectar la API.",
  };
}